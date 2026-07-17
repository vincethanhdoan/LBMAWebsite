import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';

type LoadErrorCardProps = {
  title: string;
  error: unknown;
  onRetry: () => void;
};

export function LoadErrorCard({ title, error, onRetry }: LoadErrorCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onRetry}>Try Again</Button>
      </CardContent>
    </Card>
  );
}
