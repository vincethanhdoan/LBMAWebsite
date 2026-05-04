import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Send, Paperclip, Users as UsersIcon, Loader2, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkConversationRead,
  type FormattedConversation,
  type ConversationsData,
} from '../../lib/hooks/conversations';
import { useUsers } from '../../lib/hooks/users';
import { queryKeys } from '../../lib/queryKeys';
import {
  getGlobalConversation,
  getConversationMembers,
  getFamilyByOwner,
  getFamilyWithRelations,
  type FamilyWithRelations,
} from '../../lib/supabase/queries';
import { calculateAge } from '../../lib/format';
import {
  createMessage,
  createMessageAttachment,
  createOrGetDirectConversation,
  joinGlobalConversation,
  updateConversationHidden,
} from '../../lib/supabase/mutations';
import { uploadFile, generateFilePath, isValidFileType, MAX_FILE_SIZE_MB, getFileSizeMB, getSignedUrl } from '../../lib/supabase/storage';
import {
  formatConversationTime,
  formatMessages,
  formatMessageTimestamp,
  computeMessageRenderList,
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

type MessagesTabProps = {
  user: User;
};

type DirectMessageTarget = {
  userId: string;
  displayName: string;
  role: 'admin' | 'family';
};

type ParticipantMember = {
  userId: string;
  displayName: string;
  role: 'admin' | 'family';
  avatarUrl: string | null;
};

export function MessagesTab({ user }: MessagesTabProps) {
  const queryClient = useQueryClient();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const { data: convData, isLoading: loading } = useConversations(user);
  const conversations: FormattedConversation[] = useMemo(() => convData?.conversations ?? [], [convData]);
  const allowedDirectConversationIds = useMemo(() => convData?.allowedDirectIds ?? [], [convData]);
  const { data: rawMessages = [] } = useMessages(selectedConversationId);
  const { mutate: sendMessage, isPending: sending } = useSendMessage(user);
  const { mutate: markRead } = useMarkConversationRead(user.id);

  const { data: allProfiles = [] } = useUsers();
  const [messageText, setMessageText] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);
  const [directMessageTargets, setDirectMessageTargets] = useState<DirectMessageTarget[]>([]);
  const [selectedDirectTargetId, setSelectedDirectTargetId] = useState('');
  const [creatingDirectConversation, setCreatingDirectConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showParticipants, setShowParticipants] = useState(false);
  const [participantMembers, setParticipantMembers] = useState<ParticipantMember[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [participantFamilyData, setParticipantFamilyData] = useState<FamilyWithRelations | null>(null);
  const [loadingParticipantFamily, setLoadingParticipantFamily] = useState(false);
  const globalConvId = conversations.find(c => c.type === 'group')?.id ?? null;
  const [globalConvHidden, setGlobalConvHidden] = useState(false);

  // Populate direct message targets from allProfiles
  useEffect(() => {
    if (allProfiles.length === 0) return;
    const targets = allProfiles
      .filter((profile) => profile.user_id !== user.id && isDirectConversationAllowed(user.role, profile.role))
      .map((profile) => ({
        userId: profile.user_id,
        displayName: profile.display_name || 'Unknown',
        role: profile.role,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    setDirectMessageTargets(targets);
  }, [allProfiles, user.id, user.role]);

  // Load global conversation hidden state (hidden field is not in FormattedConversation)
  useEffect(() => {
    getGlobalConversation()
      .then((globalConv) => {
        if (globalConv) {
          setGlobalConvHidden(globalConv.hidden);
          joinGlobalConversation()
            .then(() => {
              queryClient.invalidateQueries({ queryKey: queryKeys.conversations(user.id) });
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select the first (or global) conversation once loaded
  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      const global = conversations.find((c) => c.type === 'group');
      setSelectedConversationId(global?.id ?? conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [rawMessages, selectedConversationId]);

  // Mark conversation as read when selected or when new messages arrive
  useEffect(() => {
    if (!selectedConversationId || loading) return;
    markRead(selectedConversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId, loading, rawMessages.length]);

  const currentMessages = useMemo(() => formatMessages(rawMessages), [rawMessages]);

  const handleToggleGlobalChat = async () => {
    if (!globalConvId) return;
    const newHidden = !globalConvHidden;
    try {
      await updateConversationHidden(globalConvId, newHidden);
      setGlobalConvHidden(newHidden);
      if (newHidden && selectedConversationId === globalConvId) {
        setSelectedConversationId(null);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations(user.id) });
    } catch (error) {
      toast.error('Failed to update group chat: ' + getErrorMessage(error));
    }
  };

  const handleCreateDirectConversation = async () => {
    if (!selectedDirectTargetId || creatingDirectConversation) return;
    const target = directMessageTargets.find((item) => item.userId === selectedDirectTargetId);
    if (!target) return;

    setCreatingDirectConversation(true);
    try {
      const conversationId = await createOrGetDirectConversation(selectedDirectTargetId);
      // Optimistically add the new conversation so the input is usable immediately
      queryClient.setQueryData<ConversationsData>(
        queryKeys.conversations(user.id),
        (old) => {
          if (!old) return old;
          if (old.conversations.some((c) => c.id === conversationId)) return old;
          return {
            conversations: [
              ...old.conversations,
              { id: conversationId, name: target.displayName, type: 'direct' as const, unreadCount: 0 },
            ],
            allowedDirectIds: [...old.allowedDirectIds, conversationId],
          };
        }
      );
      // Background sync to reconcile full server state
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations(user.id) });
      setSelectedConversationId(conversationId);
      setSelectedDirectTargetId('');
      setShowParticipants(false);
    } catch (error) {
      toast.error('Error creating direct conversation: ' + getErrorMessage(error));
    } finally {
      setCreatingDirectConversation(false);
    }
  };

  useEffect(() => {
    if (!showParticipants || !selectedConversationId) return;
    setSelectedParticipantId(null);
    setParticipantFamilyData(null);
    setLoadingParticipants(true);
    getConversationMembers(selectedConversationId)
      .then((members) => {
        const resolved: ParticipantMember[] = members
          .map((m) => {
            const profile = allProfiles.find((p) => p.user_id === m.user_id);
            if (!profile) return null;
            return {
              userId: profile.user_id,
              displayName: profile.display_name || 'Unknown',
              role: profile.role,
              avatarUrl: profile.avatar_url ?? null,
            };
          })
          .filter(Boolean) as ParticipantMember[];
        setParticipantMembers(resolved);
      })
      .catch(() => setParticipantMembers([]))
      .finally(() => setLoadingParticipants(false));
  }, [showParticipants, selectedConversationId, allProfiles]);

  const handleSelectParticipant = async (userId: string) => {
    if (user.role !== 'admin') return;
    const profile = allProfiles.find((p) => p.user_id === userId);
    if (!profile || profile.role !== 'family') return;
    setSelectedParticipantId(userId);
    setParticipantFamilyData(null);
    setLoadingParticipantFamily(true);
    try {
      const family = await getFamilyByOwner(userId);
      if (family) {
        const withRelations = await getFamilyWithRelations(family.family_id);
        setParticipantFamilyData(withRelations);
      }
    } catch {
      // ignore — profile view just won't show students
    } finally {
      setLoadingParticipantFamily(false);
    }
  };

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const canSendInSelectedConversation = Boolean(
    selectedConversation &&
    (
      selectedConversation.type === 'group' ||
      allowedDirectConversationIds.includes(selectedConversation.id)
    )
  );

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversationId || !user || !canSendInSelectedConversation) return;
    const text = messageText.trim();
    setMessageText('');
    sendMessage(
      { conversationId: selectedConversationId, body: text },
      { onError: () => setMessageText(text) }
    );
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
      const filePath = generateFilePath(user.id, file.name);
      const { path } = await uploadFile(file, filePath);

      const message = await createMessage({
        conversation_id: selectedConversationId,
        author_user_id: user.id,
        body: `[File: ${file.name}]`,
      });

      await createMessageAttachment({
        message_id: message.message_id,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
      });

      markRead(selectedConversationId);
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(selectedConversationId) });
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
        <h2 className="text-2xl font-bold">Messages</h2>
        <p className="text-muted-foreground mt-1">
          Connect with instructors and the LBMAA community
        </p>
      </div>

      <div className={`grid gap-6 h-[600px] max-h-[calc(100dvh-13rem)] ${showParticipants ? 'grid-cols-4' : 'md:grid-cols-3'}`}>
        {/* Conversations List */}
        <Card className="md:col-span-1 flex flex-col overflow-hidden">
          <CardHeader className="shrink-0">
            <CardTitle>Conversations</CardTitle>
            <div className="space-y-2">
              <Select
                value={selectedDirectTargetId}
                onValueChange={setSelectedDirectTargetId}
                disabled={creatingDirectConversation || directMessageTargets.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Start a direct message..." />
                </SelectTrigger>
                <SelectContent>
                  {directMessageTargets.map((target) => (
                    <SelectItem key={target.userId} value={target.userId}>
                      {target.displayName}{target.role === 'admin' ? ' (Instructor)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {user.role === 'admin' && globalConvId && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">Group Chat</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={handleToggleGlobalChat}
                  >
                    {globalConvHidden ? (
                      <><Eye className="w-3.5 h-3.5" /> Show</>
                    ) : (
                      <><EyeOff className="w-3.5 h-3.5" /> Hide</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
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
                            {conversation.avatarUrl && conversation.type === 'direct' && (
                              <AvatarImage src={conversation.avatarUrl} alt={conversation.name} />
                            )}
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
                          <Badge
                            className={`ml-2 h-5 px-2 text-xs flex-shrink-0 ${
                              selectedConversationId === conversation.id
                                ? 'bg-primary-foreground text-primary'
                                : 'bg-primary text-primary-foreground'
                            }`}
                          >
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
                {selectedConversation?.avatarUrl && selectedConversation.type === 'direct' && (
                  <AvatarImage src={selectedConversation.avatarUrl} alt={selectedConversation.name} />
                )}
                <AvatarFallback>
                  {selectedConversation?.type === 'group' ? (
                    <UsersIcon className="w-5 h-5" />
                  ) : (
                    selectedConversation?.name[0] || '?'
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle>{selectedConversation?.name || 'Select a conversation'}</CardTitle>
                {selectedConversation?.type === 'group' && (
                  <p className="text-sm text-muted-foreground">
                    All families and instructors
                  </p>
                )}
              </div>
              {selectedConversationId && (
                <Button
                  variant={showParticipants ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setShowParticipants((prev) => !prev);
                    setSelectedParticipantId(null);
                    setParticipantFamilyData(null);
                  }}
                  className="flex-shrink-0"
                >
                  <UsersIcon className="w-4 h-4 mr-1.5" />
                  People
                  {showParticipants && participantMembers.length > 0 && (
                    <span className="ml-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">
                      {participantMembers.length}
                    </span>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div>
                {currentMessages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No messages yet. Start the conversation!
                  </p>
                ) : (() => {
                  const isGroupConversation = selectedConversation?.type === 'group';
                  return computeMessageRenderList(currentMessages).map(
                    ({ message, isFirstInGroup, isLastInGroup, showDateSeparator, dateLabel }) => {
                      const isOwnMessage = message.authorId === user.id;
                      return (
                        <div key={message.id}>
                          {showDateSeparator && (
                            <div className="flex items-center gap-3 my-5">
                              <div className="flex-1 h-px bg-border" />
                              <span className="text-xs font-medium text-muted-foreground px-1">{dateLabel}</span>
                              <div className="flex-1 h-px bg-border" />
                            </div>
                          )}
                          <div
                            className={`flex items-end gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'} ${isLastInGroup ? 'mb-5' : 'mb-0.5'}`}
                          >
                            {!isOwnMessage && (
                              <div className="w-7 flex-shrink-0 self-end">
                                {isLastInGroup ? (
                                  <Avatar className="h-7 w-7">
                                    {message.authorAvatarUrl && (
                                      <AvatarImage src={message.authorAvatarUrl} alt={message.authorName} />
                                    )}
                                    <AvatarFallback className="text-xs">
                                      {message.authorName[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : null}
                              </div>
                            )}
                            <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                              {!isOwnMessage && isFirstInGroup && isGroupConversation && (
                                <p className="text-xs font-semibold text-muted-foreground px-3 mb-1">
                                  {message.authorName}
                                </p>
                              )}
                              <div
                                className={`px-4 py-2.5 rounded-2xl ${
                                  isOwnMessage
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary text-secondary-foreground'
                                }`}
                              >
                                <p className="text-sm leading-relaxed">{message.body}</p>
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
                              </div>
                              {isLastInGroup && (
                                <p className={`text-xs text-muted-foreground px-3 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                                  {formatMessageTimestamp(message.createdAt)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  );
                })()}
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
        {/* Participants panel */}
        {showParticipants && (
          <Card className="col-span-1 flex flex-col overflow-hidden">
            <CardHeader className="shrink-0 border-b py-3">
              <div className="flex items-center justify-between gap-2">
                {selectedParticipantId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 px-1 text-sm font-semibold"
                    onClick={() => { setSelectedParticipantId(null); setParticipantFamilyData(null); }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    All members
                  </Button>
                ) : (
                  <CardTitle className="text-base">
                    People
                    {participantMembers.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {participantMembers.length}
                      </span>
                    )}
                  </CardTitle>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                {loadingParticipants ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : selectedParticipantId ? (
                  /* Family profile view */
                  (() => {
                    const profile = allProfiles.find((p) => p.user_id === selectedParticipantId);
                    return (
                      <div className="p-4 space-y-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                            <AvatarFallback className="text-sm font-bold bg-secondary text-primary">
                              {(profile?.display_name || '?')[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold leading-tight truncate">{profile?.display_name || 'Unknown'}</p>
                            <span className="inline-block mt-1 text-xs font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              Family
                            </span>
                          </div>
                        </div>

                        {loadingParticipantFamily ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : participantFamilyData?.students && participantFamilyData.students.length > 0 ? (
                          <div className="space-y-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Students</p>
                            {participantFamilyData.students
                              .filter((s) => s.status === 'active')
                              .map((student) => (
                                <div
                                  key={student.student_id}
                                  className="bg-card border rounded-lg p-3 space-y-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-7 w-7 flex-shrink-0">
                                      {student.photo_url && <AvatarImage src={student.photo_url} />}
                                      <AvatarFallback className="text-xs">
                                        {student.first_name[0]}{student.last_name[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm leading-tight truncate">
                                        {student.first_name} {student.last_name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Age {calculateAge(student.date_of_birth)}
                                      </p>
                                    </div>
                                    <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                                      {student.belt_level ?? 'No Belt'}
                                    </span>
                                  </div>
                                  {student.notes && (
                                    <div className="bg-accent rounded-md px-2.5 py-2">
                                      <p className="text-xs font-bold uppercase tracking-wider text-accent-foreground mb-1">
                                        Parent note
                                      </p>
                                      <p className="text-xs italic text-foreground leading-relaxed">
                                        {student.notes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })()
                ) : (
                  /* Members list */
                  <div className="p-2 space-y-1">
                    {(['admin', 'family'] as const).map((role) => {
                      const members = participantMembers.filter((m) => m.role === role);
                      if (members.length === 0) return null;
                      return (
                        <div key={role}>
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2 py-2">
                            {role === 'admin' ? 'Instructors' : 'Families'}
                          </p>
                          {members.map((member) => {
                            const isClickable = user.role === 'admin' && member.role === 'family';
                            return (
                              <button
                                key={member.userId}
                                type="button"
                                disabled={!isClickable}
                                onClick={() => isClickable && handleSelectParticipant(member.userId)}
                                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors ${
                                  isClickable ? 'hover:bg-secondary cursor-pointer' : 'cursor-default'
                                }`}
                              >
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  {member.avatarUrl && <AvatarImage src={member.avatarUrl} />}
                                  <AvatarFallback className={`text-xs font-bold ${member.role === 'admin' ? 'bg-secondary text-primary' : 'bg-muted'}`}>
                                    {member.displayName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm truncate">{member.displayName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {member.role === 'admin' ? 'Instructor' : 'Family'}
                                  </p>
                                </div>
                                {isClickable && (
                                  <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground rotate-180 flex-shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

    </div>
  );
}
