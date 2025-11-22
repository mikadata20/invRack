-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_username TEXT NOT NULL,
  content TEXT NOT NULL,
  channel_id TEXT DEFAULT 'general' NOT NULL, -- For general chat, can be extended for private/group chats
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read all messages in the 'general' channel
CREATE POLICY "Allow authenticated users to read general chat messages" ON public.chat_messages
FOR SELECT TO authenticated USING (channel_id = 'general');

-- Policy for authenticated users to insert their own messages
CREATE POLICY "Allow authenticated users to insert their own chat messages" ON public.chat_messages
FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);