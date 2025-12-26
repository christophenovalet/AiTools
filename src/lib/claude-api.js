import chatbotConfig from '@/data/chatbot-config.json'
import defaultTags from '@/data/tags.json'
import defaultAiInstructions from '@/data/ai-instructions.json'

const API_URL = 'https://api.anthropic.com/v1/messages'
const TAGS_STORAGE_KEY = 'textbuilder-tags'
const AI_INSTRUCTIONS_STORAGE_KEY = 'textbuilder-ai-instructions'

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

function buildMessageContent(message) {
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

    // Add text content if present
    if (message.content && message.content.trim()) {
      content.push({
        type: 'text',
        text: message.content
      })
    }

    return content
  }

  // Plain text message
  return message.content
}

export function getModels() {
  return chatbotConfig.models
}

export function getDefaultModel() {
  return chatbotConfig.defaultModel
}

export async function sendMessage(messages, onChunk, onComplete, onError, onSearchStart, onSearchResult, modelKey) {
  const { apiKey, maxTokens, models, defaultModel } = chatbotConfig
  const selectedModel = models[modelKey || defaultModel]
  const model = selectedModel?.id || models[defaultModel].id
  const tools = buildTools()

  try {
    const requestBody = {
      model,
      max_tokens: maxTokens,
      stream: true,
      messages: messages.map(m => ({
        role: m.role,
        content: buildMessageContent(m)
      }))
    }

    // Only include tools if there are any configured
    if (tools.length > 0) {
      requestBody.tools = tools
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API error: ${response.status} - ${errorText}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let currentContentBlock = null
    let searchResults = []

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

            if (parsed.type === 'message_stop') {
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
    onError(error)
  }
}

export function getMenuItems() {
  return chatbotConfig.menuItems
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

  if (template.includes('{tags_json}')) {
    const tagsData = getTagsAndInstructions()
    result = result.replace('{tags_json}', JSON.stringify(tagsData, null, 2))
  }

  return result
}
