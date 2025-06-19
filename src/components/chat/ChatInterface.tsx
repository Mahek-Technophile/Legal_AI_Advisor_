import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useFirebaseAuth } from '../../contexts/FirebaseAuthContext';
import { useScrollPosition } from '../../hooks/useScrollPosition';
import { processUserMessage, shouldTriggerGreeting } from '../../utils/greetingDetection';
import { LegalChatInterface } from './LegalChatInterface';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isGreeting?: boolean;
}

interface ChatInterfaceProps {
  context: string;
  placeholder?: string;
  initialMessage?: string;
  systemPrompt?: string;
  country?: string;
}

export function ChatInterface({ 
  context, 
  placeholder = "Type your message...", 
  initialMessage = "",
  systemPrompt = "You are a helpful legal AI assistant.",
  country
}: ChatInterfaceProps) {
  // Use the enhanced Legal Chat Interface for all legal contexts
  return (
    <LegalChatInterface
      context={context}
      placeholder={placeholder}
      initialMessage={initialMessage}
      systemPrompt={systemPrompt}
      country={country}
    />
  );
}