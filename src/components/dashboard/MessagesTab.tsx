import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Send, Paperclip, Users as UsersIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getGlobalConversation,
  getUserConversations,
  getConversationMembers,
  getMessages,
  getAllProfiles,
  getDirectMessageConversation,
} from '../../lib/supabase/queries';
import {
  addConversationMember,
  createMessage,
  createMessageAttachment,
  createOrGetDirectConversation,
  markConversationAsRead,
} from '../../lib/supabase/mutations';
import { subscribeToMessages, unsubscribe } from '../../lib/supabase/realtime';
import { uploadFile, generateFilePath, isValidFileType, MAX_FILE_SIZE_MB, getFileSizeMB, getSignedUrl } from '../../lib/supabase/storage';
import {
  calculateUnreadCount,
  formatConversationTime,
  formatMessages,
  formatMessageTime,
  getErrorMessage,
  isDirectConversationAllowed,
  type MessageListItem,
} from './messages/helpers';

type User = {
  id: string;
  email: string;
  role: 'admin' | 'family';
  displayName: string;
};

type Conversation = {
  id: string;
  name: string;
  type: 'direct' | 'group';
  unreadCount: number;
  lastMessage?: string;
  lastMessageTime?: string;
};

type MessagesTabProps = {
  user: User;
  onUnreadCountChange?: (count: number) => void;
};

type DirectMessageTarget = {
  userId: string;
  displayName: string;
  role: 'admin' | 'family';
};

export function MessagesTab({ user, onUnreadCountChange }: MessagesTabProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ [conversationId: string]: MessageListItem[] }>({});
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);
  const [allowedDirectConversationIds, setAllowedDirectConversationIds] = useState<string[]>([]);
  const [directMessageTargets, setDirectMessageTargets] = useState<DirectMessageTarget[]>([]);
  const [selectedDirectTargetId, setSelectedDirectTargetId] = useState('');
  const [creatingDirectConversation, setCreatingDirectConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!onUnreadCountChange) return;
    const totalUnread = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);
    onUnreadCountChange(totalUnread);
  }, [conversations, onUnreadCountChange]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedConversationId]);

  const updateConversationReadState = async (conversationId: string) => {
    await markConversationAsRead(conversationId, user.id);
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, unreadCount: 0 }
          : conversation,
      ),
    );
  };

  const upsertConversation = (conversation: Conversation) => {
    setConversations((previous) => {
      const existingIndex = previous.findIndex((item) => item.id === conversation.id);
      if (existingIndex >= 0) {
        const updated = [...previous];
        updated[existingIndex] = conversation;
        return updated;
      }
      return [conversation, ...previous];
    });
  };

  const safeAddConversationMember = async (conversationId: string, memberUserId: string) => {
    try {
      await addConversationMember({
        conversation_id: conversationId,
        user_id: memberUserId,
      });
    } catch (error: any) {
      if (error?.code !== '23505') {
        throw error;
      }
    }
  };

  const handleCreateDirectConversation = async () => {
    if (!selectedDirectTargetId || creatingDirectConversation) return;
    const target = directMessageTargets.find((item) => item.userId === selectedDirectTargetId);
    if (!target) return;

    setCreatingDirectConversation(true);
    try {
      let directConversation = await getDirectMessageConversation(user.id, selectedDirectTargetId);
      if (!directConversation) {
        const conversationId = await createOrGetDirectConversation(selectedDirectTargetId);
        const refreshedConversations = await getUserConversations(user.id);
        directConversation = refreshedConversations.find((conversation) => conversation.conversation_id === conversationId) || null;
        if (!directConversation) {
          throw new Error('Conversation was created but could not be loaded.');
        }
      }

      const directMessages = await getMessages(directConversation.conversation_id);
      const lastMessage = directMessages[directMessages.length - 1];
      const selfMembership = Array.isArray((directConversation as any).conversation_members)
        ? (directConversation as any).conversation_members.find((member: any) => member.user_id === user.id)
        : null;

      setMessages((previous) => ({
        ...previous,
        [directConversation!.conversation_id]: formatMessages(directMessages),
      }));

      setAllowedDirectConversationIds((previous) =>
        previous.includes(directConversation!.conversation_id)
          ? previous
          : [...previous, directConversation!.conversation_id],
      );

      upsertConversation({
        id: directConversation.conversation_id,
        name: target.displayName,
        type: 'direct',
        unreadCount: calculateUnreadCount(directMessages, user.id, selfMembership?.last_read_at),
        lastMessage: lastMessage?.body?.substring(0, 50),
        lastMessageTime: lastMessage?.created_at,
      });

      setSelectedConversationId(directConversation.conversation_id);
      setSelectedDirectTargetId('');
    } catch (error) {
      toast.error('Error creating direct conversation: ' + getErrorMessage(error));
    } finally {
      setCreatingDirectConversation(false);
    }
  };

  // Load conversations and ensure global conversation exists
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoading(true);
        
        // Load all profiles for DM names
        const profiles = await getAllProfiles();
        const allowedTargets = profiles
          .filter((profile) => profile.user_id !== user.id && isDirectConversationAllowed(user.role, profile.role))
          .map((profile) => ({
            userId: profile.user_id,
            displayName: profile.display_name || 'Unknown',
            role: profile.role,
          }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName));
        setDirectMessageTargets(allowedTargets);

        // Get global conversation if available. Do not create here.
        // Global creation can be blocked by RLS depending on account setup.
        let globalConv = await getGlobalConversation();

        // Ensure current user is a member of the global conversation.
        if (globalConv) {
          try {
            await safeAddConversationMember(globalConv.conversation_id, user.id);
          } catch (memberError: any) {
            if (memberError?.code !== '42501') {
              throw memberError;
            }
          }
        }

        // Load user's conversations
        const userConvs = await getUserConversations(user.id);
        
        // Format conversations
        const formattedConvs: Conversation[] = [];
        const validDirectConversationIds: string[] = [];
        
        // Add all available conversations
        for (const conv of userConvs) {
          const convMembers = Array.isArray((conv as any).conversation_members) ? (conv as any).conversation_members : [];
          const selfMembership = convMembers.find((member: any) => member.user_id === user.id);
          const convMessages = await getMessages(conv.conversation_id);
          const lastMsg = convMessages[convMessages.length - 1];
          const unreadCount = calculateUnreadCount(convMessages, user.id, selfMembership?.last_read_at);

          if (conv.type === 'global') {
            formattedConvs.push({
              id: conv.conversation_id,
              name: 'Everyone - Group Chat',
              type: 'group',
              unreadCount,
              lastMessage: lastMsg?.body?.substring(0, 50),
              lastMessageTime: lastMsg?.created_at,
            });

            setMessages((prev) => ({
              ...prev,
              [conv.conversation_id]: formatMessages(convMessages),
            }));
            continue;
          }

          if (conv.type !== 'dm') continue;

          const members = await getConversationMembers(conv.conversation_id);
          const otherMember = members.find((m: any) => m.user_id !== user.id);
          if (!otherMember) continue;

          const otherProfile = profiles.find((p: any) => p.user_id === otherMember?.user_id);
          if (!isDirectConversationAllowed(user.role, otherProfile?.role)) continue;

          validDirectConversationIds.push(conv.conversation_id);

          formattedConvs.push({
            id: conv.conversation_id,
            name: otherProfile?.display_name || 'Unknown',
            type: 'direct',
            unreadCount,
            lastMessage: lastMsg?.body?.substring(0, 50),
            lastMessageTime: lastMsg?.created_at,
          });

          setMessages((prev) => ({
            ...prev,
            [conv.conversation_id]: formatMessages(convMessages),
          }));
        }

        setAllowedDirectConversationIds(validDirectConversationIds);
        setConversations(formattedConvs);
        
        // Select global conversation by default when available
        if (formattedConvs.length > 0) {
          const globalConversation = formattedConvs.find((conversation) => conversation.type === 'group');
          setSelectedConversationId(globalConversation?.id ?? formattedConvs[0].id);
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
        toast.error('Error loading conversations: ' + getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [user]);

  useEffect(() => {
    if (!selectedConversationId || loading) return;
    updateConversationReadState(selectedConversationId).catch((error) => {
      console.error('Failed to mark conversation as read:', error);
    });
  }, [selectedConversationId, loading]);

  // Set up real-time subscriptions for selected conversation
  useEffect(() => {
    if (!selectedConversationId) return;

    const channel = subscribeToMessages(selectedConversationId, (payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        // Reload messages for this conversation
        getMessages(selectedConversationId).then((messagesData) => {
          setMessages((prev) => ({
            ...prev,
            [selectedConversationId]: formatMessages(messagesData),
          }));
        });
      }
    });

    return () => {
      unsubscribe(channel);
    };
  }, [selectedConversationId]);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const currentMessages = selectedConversationId ? (messages[selectedConversationId] || []) : [];
  const canSendInSelectedConversation = Boolean(
    selectedConversation &&
    (
      selectedConversation.type === 'group' ||
      allowedDirectConversationIds.includes(selectedConversation.id)
    )
  );

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversationId || !user || !canSendInSelectedConversation) return;

    setSending(true);
    try {
      await createMessage({
        conversation_id: selectedConversationId,
        author_user_id: user.id,
        body: messageText.trim(),
      });

      await updateConversationReadState(selectedConversationId);

      // Reload messages
      const messagesData = await getMessages(selectedConversationId);
      setMessages((prev) => ({
        ...prev,
        [selectedConversationId]: formatMessages(messagesData),
      }));

      setMessageText('');
    } catch (error) {
      toast.error('Error sending message: ' + getErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversationId || !user) return;
    if (!canSendInSelectedConversation) {
      toast.error('Attachments are only allowed in family-to-staff or staff-to-staff direct messages and the group chat.');
      return;
    }

    if (!isValidFileType(file.name)) {
      toast.error('Invalid file type. Please upload images, PDFs, or documents.');
      return;
    }

    const fileSizeMB = getFileSizeMB(file.size);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      toast.error(`File size exceeds ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setUploadingFile(true);
    try {
      // Upload file
      const filePath = generateFilePath(user.id, file.name);
      const { path } = await uploadFile(file, filePath);

      // Send message with attachment
      const message = await createMessage({
        conversation_id: selectedConversationId,
        author_user_id: user.id,
        body: `[File: ${file.name}]`,
      });

      await updateConversationReadState(selectedConversationId);

      // Create attachment record
      await createMessageAttachment({
        message_id: message.message_id,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
      });

      // Reload messages
      const messagesData = await getMessages(selectedConversationId);
      setMessages((prev) => ({
        ...prev,
        [selectedConversationId]: formatMessages(messagesData),
      }));
    } catch (error) {
      toast.error('Error uploading file: ' + getErrorMessage(error));
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpenAttachment = async (message: MessageListItem) => {
    if (!message.attachmentPath) return;

    setOpeningAttachmentId(message.id);
    try {
      const signedUrl = await getSignedUrl(message.attachmentPath, 300);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error('Unable to open attachment: ' + getErrorMessage(error));
    } finally {
      setOpeningAttachmentId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Messages</h2>
        <p className="text-muted-foreground mt-1">
          Connect with instructors and the LBMAA community
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <div className="space-y-2">
              <select
                value={selectedDirectTargetId}
                onChange={(event) => setSelectedDirectTargetId(event.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={creatingDirectConversation || directMessageTargets.length === 0}
              >
                <option value="">Start a direct message...</option>
                {directMessageTargets.map((target) => (
                  <option key={target.userId} value={target.userId}>
                    {target.displayName} ({target.role === 'admin' ? 'Instructor/Admin' : 'Family'})
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={!selectedDirectTargetId || creatingDirectConversation}
                onClick={handleCreateDirectConversation}
              >
                {creatingDirectConversation ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Opening...
                  </>
                ) : (
                  'Open Direct Message'
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="space-y-1 p-4 pt-0">
                {conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4">No conversations yet.</p>
                ) : (
                  conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversationId(conversation.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedConversationId === conversation.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-secondary'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarFallback>
                              {conversation.type === 'group' ? (
                                <UsersIcon className="w-5 h-5" />
                              ) : (
                                conversation.name[0]
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{conversation.name}</p>
                            {conversation.lastMessage && (
                              <p className="text-sm opacity-70 truncate">
                                {conversation.lastMessage}
                              </p>
                            )}
                          </div>
                        </div>
                        {conversation.unreadCount > 0 && (
                          <Badge className="ml-2 h-5 px-2 text-xs bg-primary flex-shrink-0">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                      {conversation.lastMessageTime && (
                        <p className="text-xs opacity-70 mt-1">
                          {formatConversationTime(conversation.lastMessageTime)}
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Messages Area */}
        <Card className="md:col-span-2 flex flex-col">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {selectedConversation?.type === 'group' ? (
                    <UsersIcon className="w-5 h-5" />
                  ) : (
                    selectedConversation?.name[0] || '?'
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{selectedConversation?.name || 'Select a conversation'}</CardTitle>
                {selectedConversation?.type === 'group' && (
                  <p className="text-sm text-muted-foreground">
                    All families and instructors
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {currentMessages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  currentMessages.map((message) => {
                    const isOwnMessage = message.authorId === user.id;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] ${
                            isOwnMessage
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary'
                          } rounded-lg p-3`}
                        >
                          {!isOwnMessage && (
                            <p className="text-xs font-medium mb-1 opacity-70">
                              {message.authorName}
                            </p>
                          )}
                          <p className="text-sm">{message.body}</p>
                          {message.attachmentName && (
                            <div className="flex items-center gap-1 mt-2 text-xs opacity-70">
                              <Paperclip className="w-3 h-3" />
                              <button
                                type="button"
                                className="underline text-left disabled:no-underline disabled:opacity-70"
                                onClick={() => handleOpenAttachment(message)}
                                disabled={openingAttachmentId === message.id}
                              >
                                {openingAttachmentId === message.id ? 'Opening...' : message.attachmentName}
                              </button>
                            </div>
                          )}
                          <p className="text-xs opacity-70 mt-1">
                            {formatMessageTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            {selectedConversationId && (
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                    disabled={uploadingFile || !canSendInSelectedConversation}
                  >
                    {uploadingFile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Paperclip className="w-4 h-4" />
                    )}
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    className="flex-1"
                    disabled={sending || !canSendInSelectedConversation}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sending || !canSendInSelectedConversation}
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedConversation?.type === 'direct'
                    ? (canSendInSelectedConversation
                        ? 'Direct message for family-to-staff or staff-to-staff communication'
                        : 'This direct message violates messaging policy and is read-only.')
                    : 'Message visible to all families and instructors'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Box */}
      <Card className="bg-secondary border-primary/20">
        <CardContent className="pt-6">
          <p className="text-sm">
            <strong>Note:</strong> Direct messaging is available for family-to-staff and staff-to-staff only. 
            For parent-to-parent communication, please use the Parent Blog or Group Chat.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
