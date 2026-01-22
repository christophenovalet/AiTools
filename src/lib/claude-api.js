import chatbotConfig from '@/data/chatbot-config.json'
import defaultTags from '@/data/tags.json'
import defaultAiInstructions from '@/data/ai-instructions.json'
import { storageAdapter } from './storage-adapter'

const API_URL = 'https://api.anthropic.com/v1/messages'
// Use proxy in development to avoid CORS issues with Admin API
const COST_REPORT_URL = import.meta.env.DEV
  ? '/api/anthropic-admin/v1/organizations/cost_report'
  : 'https://api.anthropic.com/v1/organizations/cost_report'
const API_KEY_STORAGE_KEY = 'claude-api-key'
const ADMIN_API_KEY_STORAGE_KEY = 'claude-admin-api-key'
const TAGS_STORAGE_KEY = 'textbuilder-tags'
const AI_INSTRUCTIONS_STORAGE_KEY = 'textbuilder-ai-instructions'
const MENU_ITEMS_STORAGE_KEY = 'textbuilder-menu-items'
const MODEL_PRICING_STORAGE_KEY = 'chatbot-model-pricing'

// Default model pricing per million tokens (USD) - Claude 4.5, December 2025
const DEFAULT_MODEL_PRICING = {
  haiku: { input: 1.00, output: 5.00 },
  sonnet: { input: 3.00, output: 15.00 },
  opus: { input: 5.00, output: 25.00 }
}

// Minimum tokens required for caching by model family
const CACHE_MIN_TOKENS = {
  haiku: 2048,   // Haiku 3.5/3 requires 2048, Haiku 4.5 requires 4096
  sonnet: 1024,
  opus: 1024
}

// Estimate token count from text (~4 chars per token is a reasonable approximation)
function estimateTokens(text) {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

// Calculate total tokens in conversation history
function estimateConversationTokens(messages, context = '') {
  let total = estimateTokens(context)
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      total += estimateTokens(msg.content)
    } else if (msg.content) {
      // Handle content arrays (with attachments)
      total += estimateTokens(JSON.stringify(msg.content))
    }
  }
  return total
}

// Synchronous version for backwards compatibility (doesn't trigger sync)
export function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || ''
}

export function hasApiKey() {
  const key = getApiKey()
  return key && key.trim().length > 0
}

// Async version with encryption and sync support (use in new code)
export async function getApiKeyAsync() {
  return await storageAdapter.getItem(API_KEY_STORAGE_KEY) || ''
}

export async function saveApiKey(key) {
  await storageAdapter.setItem(API_KEY_STORAGE_KEY, key.trim())
}

function buildTools() {
  const tools = []

  if (chatbotConfig.webSearch?.enabled) {
    tools.push({
      type: 'web_search_20250305',
      name: 'web_search',
      max_uses: chatbotConfig.webSearch.maxUses || 5
    })
  }

  return tools
}

function buildMessageContent(message, addCacheControl = false) {
  // If message has attachments, build content array
  if (message.attachments && message.attachments.length > 0) {
    const content = []

    for (const attachment of message.attachments) {
      if (attachment.type === 'image') {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: attachment.mediaType,
            data: attachment.data
          }
        })
      } else if (attachment.type === 'document') {
        content.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: attachment.mediaType,
            data: attachment.data
          }
        })
      }
    }

    // Add text content if present (with optional cache control on last block)
    if (message.content && message.content.trim()) {
      const textBlock = {
        type: 'text',
        text: message.content
      }
      if (addCacheControl) {
        textBlock.cache_control = { type: 'ephemeral' }
      }
      content.push(textBlock)
    } else if (addCacheControl && content.length > 0) {
      // Add cache_control to last attachment if no text
      content[content.length - 1].cache_control = { type: 'ephemeral' }
    }

    return content
  }

  // Plain text message - convert to content block if caching needed
  if (addCacheControl) {
    return [
      {
        type: 'text',
        text: message.content,
        cache_control: { type: 'ephemeral' }
      }
    ]
  }

  return message.content
}

export function getModels() {
  return chatbotConfig.models
}

export function getDefaultModel() {
  return chatbotConfig.defaultModel
}

export async function sendMessage(messages, onChunk, onComplete, onError, onSearchStart, onSearchResult, modelKey, context = '', onUsage = null, signal = null) {
  const { maxTokens, models, defaultModel } = chatbotConfig
  const apiKey = getApiKey()
  const selectedModel = models[modelKey || defaultModel]
  const model = selectedModel?.id || models[defaultModel].id
  const tools = buildTools()

  // Determine cache threshold based on model
  const modelFamily = modelKey || defaultModel
  const cacheMinTokens = CACHE_MIN_TOKENS[modelFamily] || 1024

  // Calculate if conversation is large enough for caching
  const conversationTokens = estimateConversationTokens(messages, context)
  const shouldCacheConversation = conversationTokens >= cacheMinTokens

  // Find the index of the last user message for cache breakpoint
  const lastUserMessageIndex = messages.map(m => m.role).lastIndexOf('user')

  try {
    const requestBody = {
      model,
      max_tokens: maxTokens,
      stream: true,
      messages: messages.map((m, index) => {
        // Add cache_control to the last user message if threshold met
        const isLastUserMessage = index === lastUserMessageIndex && m.role === 'user'
        const addCache = shouldCacheConversation && isLastUserMessage
        return {
          role: m.role,
          content: buildMessageContent(m, addCache)
        }
      })
    }

    // Add system message with context if provided
    if (context && context.trim()) {
      requestBody.system = [
        {
          type: 'text',
          text: `<context>\n${context.trim()}\n</context>`,
          cache_control: { type: 'ephemeral' }
        }
      ]
    }

    // Only include tools if there are any configured
    if (tools.length > 0) {
      requestBody.tools = tools
    }

    const fetchOptions = {
      method: 'POST',
      headers: {
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(requestBody)
    }

    // Add abort signal if provided
    if (signal) {
      fetchOptions.signal = signal
    }

    const response = await fetch(API_URL, fetchOptions)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API error: ${response.status} - ${errorText}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let currentContentBlock = null
    let searchResults = []
    let usage = {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)

            // Handle content block start
            if (parsed.type === 'content_block_start') {
              currentContentBlock = parsed.content_block

              // Notify when web search starts
              if (currentContentBlock?.type === 'server_tool_use' &&
                  currentContentBlock?.name === 'web_search') {
                onSearchStart?.()
              }
            }

            // Handle text content delta
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              onChunk(parsed.delta.text)
            }

            // Handle web search tool result
            if (parsed.type === 'content_block_start' &&
                parsed.content_block?.type === 'web_search_tool_result') {
              const results = parsed.content_block.content || []

              // Check for web search errors
              const errorResult = results.find(r => r.type === 'web_search_error')
              if (errorResult) {
                const errorMessages = {
                  'too_many_requests': 'Web search rate limit exceeded. Please try again later.',
                  'invalid_input': 'Invalid search query.',
                  'max_uses_exceeded': 'Maximum web searches reached for this request.',
                  'query_too_long': 'Search query is too long.',
                  'unavailable': 'Web search is temporarily unavailable.'
                }
                const errorMsg = errorMessages[errorResult.error_code] || 'Web search failed.'
                onChunk(`\n\n*Note: ${errorMsg}*\n`)
              }

              searchResults = results
                .filter(r => r.type === 'web_search_result')
                .map(r => ({
                  url: r.url,
                  title: r.title,
                  pageAge: r.page_age
                }))
              onSearchResult?.(searchResults)
            }

            // Capture usage from message_delta (contains output_tokens count)
            if (parsed.type === 'message_delta' && parsed.usage) {
              usage.output_tokens = parsed.usage.output_tokens || 0
            }

            // Capture input tokens and cache metrics from message_start
            if (parsed.type === 'message_start' && parsed.message?.usage) {
              usage.input_tokens = parsed.message.usage.input_tokens || 0
              usage.cache_creation_input_tokens = parsed.message.usage.cache_creation_input_tokens || 0
              usage.cache_read_input_tokens = parsed.message.usage.cache_read_input_tokens || 0
            }

            if (parsed.type === 'message_stop') {
              onUsage?.(usage)
              onComplete(searchResults)
              return
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    }

    onComplete(searchResults)
  } catch (error) {
    // Handle abort separately - don't treat as error
    if (error.name === 'AbortError') {
      onComplete([]) // Complete gracefully with no search results
      return
    }
    onError(error)
  }
}

// Synchronous versions for backwards compatibility
export function getMenuItems() {
  try {
    const stored = localStorage.getItem(MENU_ITEMS_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    // Use defaults on error
  }
  return chatbotConfig.menuItems
}

export function getDefaultMenuItems() {
  return chatbotConfig.menuItems
}

export function saveMenuItems(menuItems) {
  localStorage.setItem(MENU_ITEMS_STORAGE_KEY, JSON.stringify(menuItems))
}

// Async versions with sync support
export async function getMenuItemsAsync() {
  try {
    const stored = await storageAdapter.getItem(MENU_ITEMS_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    // Use defaults on error
  }
  return chatbotConfig.menuItems
}

export async function saveMenuItemsAsync(menuItems) {
  await storageAdapter.setItem(MENU_ITEMS_STORAGE_KEY, JSON.stringify(menuItems))
}

// Synchronous versions for backwards compatibility
export function getModelPricing() {
  try {
    const stored = localStorage.getItem(MODEL_PRICING_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    // Use defaults on error
  }
  return DEFAULT_MODEL_PRICING
}

export function getDefaultModelPricing() {
  return DEFAULT_MODEL_PRICING
}

export function saveModelPricing(pricing) {
  localStorage.setItem(MODEL_PRICING_STORAGE_KEY, JSON.stringify(pricing))
}

// Async versions with sync support
export async function getModelPricingAsync() {
  try {
    const stored = await storageAdapter.getItem(MODEL_PRICING_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    // Use defaults on error
  }
  return DEFAULT_MODEL_PRICING
}

export async function saveModelPricingAsync(pricing) {
  await storageAdapter.setItem(MODEL_PRICING_STORAGE_KEY, JSON.stringify(pricing))
}

function getTagsAndInstructions() {
  let tags = defaultTags
  let aiInstructions = defaultAiInstructions

  try {
    const storedTags = localStorage.getItem(TAGS_STORAGE_KEY)
    if (storedTags) {
      tags = JSON.parse(storedTags)
    }
    const storedInstructions = localStorage.getItem(AI_INSTRUCTIONS_STORAGE_KEY)
    if (storedInstructions) {
      aiInstructions = JSON.parse(storedInstructions)
    }
  } catch (e) {
    // Use defaults on error
  }

  return {
    tags: tags.map(t => ({ name: t.name, description: t.description, category: t.category })),
    ai_instructions: aiInstructions.map(i => ({ name: i.name, description: i.description }))
  }
}

export function formatTemplate(template, selectedText) {
  let result = template.replace('{selected_text}', selectedText)
  let contextAddition = ''

  // Extract {tags_json} to context for caching instead of embedding in prompt
  if (template.includes('{tags_json}')) {
    const tagsData = getTagsAndInstructions()
    const tagsJson = JSON.stringify(tagsData, null, 2)
    // Remove the tags_json placeholder and its surrounding tag from the prompt
    result = result.replace(/<tags_and_instructions_reference>\s*\{tags_json\}\s*<\/tags_and_instructions_reference>/s, '<tags_and_instructions_reference>\nSee context\n</tags_and_instructions_reference>')
    // Also handle if it's used without the wrapper tag
    result = result.replace('{tags_json}', 'See context for tags and instructions reference')
    // Add to context for caching
    contextAddition = `<tags_and_instructions_reference>\n${tagsJson}\n</tags_and_instructions_reference>`
  }

  return { prompt: result, contextAddition }
}

// Admin API Key functions (synchronous for backwards compatibility)
export function getAdminApiKey() {
  return localStorage.getItem(ADMIN_API_KEY_STORAGE_KEY) || ''
}

export function hasAdminApiKey() {
  const key = getAdminApiKey()
  return key && key.trim().length > 0
}

export function saveAdminApiKey(key) {
  localStorage.setItem(ADMIN_API_KEY_STORAGE_KEY, key.trim())
}

// Async versions with encryption and sync support
export async function getAdminApiKeyAsync() {
  return await storageAdapter.getItem(ADMIN_API_KEY_STORAGE_KEY) || ''
}

export async function saveAdminApiKeyAsync(key) {
  await storageAdapter.setItem(ADMIN_API_KEY_STORAGE_KEY, key.trim())
}

// Cost Report API
export async function fetchCostReport(startingAt, endingAt = null) {
  const adminKey = getAdminApiKey()
  if (!adminKey) {
    throw new Error('Admin API key is required')
  }

  const params = new URLSearchParams({
    starting_at: startingAt,
    bucket_width: '1d',
    'group_by[]': 'description'
  })

  if (endingAt) {
    params.append('ending_at', endingAt)
  }

  const response = await fetch(`${COST_REPORT_URL}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'x-api-key': adminKey,
      'anthropic-version': '2023-06-01'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API error: ${response.status} - ${errorText}`)
  }

  return response.json()
}
