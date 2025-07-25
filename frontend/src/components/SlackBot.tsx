import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Send, 
  Bot, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Settings,
  Zap,
  Clock,
  User,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ParsedTask {
  recipient: string;
  task: string;
  due_date: string;
  response_required: boolean;
  output: string;
}

interface TaskResponse {
  success: boolean;
  parsed_task?: ParsedTask;
  message: string;
  slack_sent: boolean;
}

interface SlackStatus {
  connected: boolean;
  message: string;
}

interface SlackConfig {
  config: {
    openai_configured: boolean;
    slack_bot_configured: boolean;
    slack_app_configured: boolean;
    default_channel: string;
  };
  all_configured: boolean;
}

export default function SlackBot() {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState('');
  const [parsedTasks, setParsedTasks] = useState<TaskResponse[]>([]);
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);
  const [slackConfig, setSlackConfig] = useState<SlackConfig | null>(null);
  const [sendToSlack, setSendToSlack] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    checkSlackStatus();
    checkSlackConfig();
  }, []);

  const checkSlackStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/slack-bot/status`);
      const data: SlackStatus = await response.json();
      setSlackStatus(data);
    } catch (error) {
      console.error('Failed to check Slack status:', error);
    }
  };

  const checkSlackConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/slack-bot/config`);
      const data: SlackConfig = await response.json();
      setSlackConfig(data);
    } catch (error) {
      console.error('Failed to check Slack config:', error);
    }
  };

  const simulateLoadingSteps = () => {
    const steps = [
      { progress: 20, step: 'Parsing task with AI...' },
      { progress: 40, step: 'Extracting recipient and details...' },
      { progress: 60, step: 'Validating Slack configuration...' },
      { progress: 80, step: 'Sending message to Slack...' },
      { progress: 100, step: 'Task completed!' }
    ];

    steps.forEach(({ progress, step }, index) => {
      setTimeout(() => {
        setLoadingProgress(progress);
        setLoadingStep(step);
      }, index * 800);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingStep('Starting...');
    simulateLoadingSteps();

    try {
      const endpoint = sendToSlack ? '/slack-bot/parse-task' : '/slack-bot/parse-only';
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw_text: inputText,
        }),
      });

      const data: TaskResponse = await response.json();
      
      if (data.success) {
        setParsedTasks(prev => [data, ...prev]);
        
        if (sendToSlack) {
          if (data.slack_sent) {
            toast({
              title: "✅ Task Sent to Slack!",
              description: `Message sent to ${data.parsed_task?.recipient} in #${slackConfig?.config.default_channel}`,
            });
          } else {
            toast({
              title: "⚠️ Task Parsed but Not Sent",
              description: "Task was parsed successfully but couldn't be sent to Slack. Check your configuration.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "✅ Task Parsed Successfully",
            description: data.message,
          });
        }
        
        setInputText('');
      } else {
        toast({
          title: "❌ Error Processing Task",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to process task:', error);
      toast({
        title: "❌ Network Error",
        description: "Failed to connect to the server. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      // Keep the loading state for a moment to show completion
      setTimeout(() => {
        setIsLoading(false);
        setLoadingProgress(0);
        setLoadingStep('');
      }, 1000);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return dateString;
    }
  };

  const getStatusIcon = (connected: boolean) => {
    return connected ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Configuration Warning */}
      {slackConfig && !slackConfig.all_configured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Slack Integration Not Configured
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>To send messages to Slack, you need to:</p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Create a Slack app at <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="underline">https://api.slack.com/apps</a></li>
                  <li>Get your Bot User OAuth Token (starts with <code className="bg-yellow-100 px-1 rounded">xoxb-</code>)</li>
                  <li>Get your App-Level Token (starts with <code className="bg-yellow-100 px-1 rounded">xapp-</code>)</li>
                  <li>Update your <code className="bg-yellow-100 px-1 rounded">.env</code> file with the real tokens</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bot className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold">TaskPilot AI</h1>
            <p className="text-muted-foreground">Parse tasks and send to Slack</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Configuration Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {slackConfig && (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(slackConfig.config.openai_configured)}
                  <span>OpenAI API</span>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(slackConfig.config.slack_bot_configured)}
                  <span>Slack Bot Token</span>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(slackConfig.config.slack_app_configured)}
                  <span>Slack App Token</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    Channel: {slackConfig.config.default_channel}
                  </span>
                </div>
              </div>
            )}
            {slackStatus && (
              <div className="flex items-center space-x-2">
                {getStatusIcon(slackStatus.connected)}
                <span>{slackStatus.message}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>Task Input</CardTitle>
          <CardDescription>
            Describe a task in natural language. The AI will parse it and optionally send it to Slack.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-input">Task Description</Label>
              <Textarea
                id="task-input"
                placeholder="e.g., Remind Alex to review Q3 numbers by Friday and summarize the response"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-[100px]"
                disabled={isLoading}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="slack-toggle"
                checked={sendToSlack}
                onCheckedChange={setSendToSlack}
                disabled={!slackConfig?.all_configured}
              />
              <Label htmlFor="slack-toggle">
                Send to Slack {!slackConfig?.all_configured && "(not configured)"}
              </Label>
            </div>

            {/* Loading Progress Bar */}
            {isLoading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{loadingStep}</span>
                  <span className="text-muted-foreground">{loadingProgress}%</span>
                </div>
                <Progress value={loadingProgress} className="w-full" />
              </div>
            )}

            <Button type="submit" disabled={isLoading || !inputText.trim()} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Task...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {sendToSlack ? 'Parse & Send to Slack' : 'Parse Only'}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {parsedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Parsed Tasks</CardTitle>
            <CardDescription>
              Recent task parsing results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {parsedTasks.map((taskResponse, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Task Parsed Successfully</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {taskResponse.slack_sent ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 px-2.5 py-0.5 text-xs font-semibold">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Sent to Slack
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-800 px-2.5 py-0.5 text-xs font-semibold">
                          Parse Only
                        </span>
                      )}
                    </div>
                  </div>

                  {taskResponse.parsed_task && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Recipient:</span>
                          <span>{taskResponse.parsed_task.recipient}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Due Date:</span>
                          <span>{formatDate(taskResponse.parsed_task.due_date)}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Zap className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Response Required:</span>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            taskResponse.parsed_task.response_required 
                              ? "bg-blue-100 text-blue-800" 
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {taskResponse.parsed_task.response_required ? "Yes" : "No"}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Bot className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Output:</span>
                          <span>{taskResponse.parsed_task.output}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />
                  
                  <div>
                    <span className="font-medium">Task:</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {taskResponse.parsed_task?.task}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 