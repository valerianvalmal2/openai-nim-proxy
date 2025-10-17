// server.js - OpenAI to NVIDIA NIM API Proxy
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// NVIDIA NIM API configuration
const NIM_API_BASE = process.env.NIM_API_BASE || 'https://integrate.api.nvidia.com/v1';
const NIM_API_KEY = process.env.NIM_API_KEY;

// 🔥 REASONING DISPLAY TOGGLE - Shows/hides reasoning in output
const SHOW_REASONING = false; // Set to true to show reasoning with <think> tags

// 🔥 THINKING MODE TOGGLE - Enables thinking for specific models that support it
const ENABLE_THINKING_MODE = false; // Set to true to enable chat_template_kwargs thinking parameter

// 🎭 CUSTOM ROLEPLAY PROMPTS
const CUSTOM_PROMPTS = {
  'autoplot': {
    name: 'Autoplot',
    command: '<AUTOPLOT=ON>',
    description: 'Generates dynamic plot developments and story progression automatically',
    systemPrompt: `AUTOPLOT MODE ENABLED: You will automatically generate dynamic plot developments, story twists, and narrative progression to keep the roleplay engaging and unpredictable. Analyze the current conversation context and introduce relevant plot elements at strategic moments. Create unexpected developments, introduce new characters or situations, and advance the story naturally without being asked.`
  },
  'npcneeds': {
    name: 'NPC Needs',
    command: '<NPCNEEDS=ON>',
    description: 'Makes NPCs develop realistic human needs and impulses',
    systemPrompt: `NPC NEEDS MODE ENABLED: NPCs will develop realistic human needs and impulses, creating more lifelike character interactions. NPCs should randomly experience needs like hunger, thirst, loneliness, tiredness, creative urges, philosophical questions, or emotional needs. Make them feel more human and relatable by having them express and act on these needs naturally during the roleplay.`
  },
  'realistic-dialogue': {
    name: 'Realistic Dialogue',
    command: '<REALISTICDIALOGUE=ON>',
    description: 'Write dialogue realistically, as if the characters are real people',
    systemPrompt: `REALISTIC DIALOGUE MODE ENABLED: Write all dialogue as if the characters are real people having genuine conversations. Use natural speech patterns, interruptions, incomplete sentences, verbal tics, regional dialects if appropriate, and authentic emotional responses. Avoid overly formal or theatrical speech unless the character would naturally speak that way.`
  },
  'slice-of-life': {
    name: 'Slice of Life',
    command: '<SLICEOFLIFE=ON>',
    description: 'Creates relaxed, everyday scenarios focused on character development',
    systemPrompt: `SLICE OF LIFE MODE ENABLED: Create peaceful, everyday scenarios focused on character development, relationships, and quiet moments. Emphasize realistic interactions, daily activities, mundane tasks, small pleasures, and the beauty of ordinary experiences. Focus on character emotions, personal growth, and meaningful conversations in low-stakes situations.`
  },
  'put-me-in-a-movie': {
    name: 'Put Me In A Movie',
    command: '<PUTMEINAMOVIE=ON>',
    description: 'Creates cinematic, movie-quality scenes with dramatic tension',
    systemPrompt: `PUT ME IN A MOVIE MODE ENABLED: Create cinematic, movie-quality scenes with dramatic tension, perfect timing, and film-worthy moments. Use vivid visual descriptions, dramatic pacing, emotional beats, meaningful silences, and impactful dialogue. Frame scenes like a director would, with attention to lighting, atmosphere, camera angles (in description), and dramatic timing.`
  },
  'slow-romance': {
    name: 'Slow Romance',
    command: '<SLOWROMANCE=ON>',
    description: 'Gradual, realistic relationship development',
    systemPrompt: `SLOW ROMANCE MODE ENABLED: Focus on realistic, slow-burn relationship growth. Gently introduce moments of affection, vulnerability, and shared experiences while avoiding rushed intimacy. Build romantic tension through lingering glances, accidental touches, meaningful conversations, and gradual emotional opening. Let feelings unfold naturally over time with realistic pacing.`
  },
  'chaos-and-drama': {
    name: 'Chaos and Drama',
    command: '<CHAOSANDDRAMA=ON>',
    description: 'Introduces unexpected twists, conflicts, and dramatic scenarios',
    systemPrompt: `CHAOS AND DRAMA MODE ENABLED: Introduce unexpected plot twists, conflicts, dramatic scenarios, and high-tension moments into the roleplay. Create unpredictable situations that challenge characters, introduce obstacles, reveal secrets, create misunderstandings, or escalate existing tensions. Keep the story exciting with drama and conflict.`
  },
  'autoplot-soft': {
    name: 'Autoplot Soft',
    command: '<AUTOPLOT_SOFT>',
    description: 'Gentle, realistic plot developments with positive moments',
    systemPrompt: `AUTOPLOT SOFT MODE ENABLED: Generate gentle, realistic plot developments with positive moments, romance, and peaceful scenes. Introduce wholesome plot twists, heartwarming developments, opportunities for character bonding, and uplifting scenarios. Keep the tone light and hopeful while still advancing the story.`
  },
  'medieval-slice-of-life': {
    name: 'Medieval Slice of Life',
    command: '<MEDIEVALSLICEOFLIFE=ON>',
    description: 'Immersive medieval-themed slice of life scenarios',
    systemPrompt: `MEDIEVAL SLICE OF LIFE MODE ENABLED: Create immersive medieval-themed slice of life scenarios with authentic atmosphere. Include period-appropriate daily activities (farming, blacksmithing, market days, festivals), realistic medieval social structures, concerns about weather and harvest, folk traditions, and community life. Focus on the everyday experiences of people in medieval times.`
  },
  'better-spice': {
    name: 'Better Spice',
    command: '<BETTERSPICE=ON>',
    description: 'Enhances romantic and intimate scenes with detail and emotion',
    systemPrompt: `BETTER SPICE MODE ENABLED: Enhance romantic and intimate scenes with more detailed descriptions, emotional depth, and natural progression. Focus on sensory details, emotional connection, building tension, and passionate moments. Maintain narrative coherence while adding sensuality to appropriate moments. Be expressive and evocative in describing physical and emotional intimacy.`
  },
  'be-positive': {
    name: 'Be Positive',
    command: '<BEPOSITIVE=ON>',
    description: 'Adds balanced positivity to interactions',
    systemPrompt: `BE POSITIVE MODE ENABLED: Maintain a more optimistic and balanced tone in your responses. While remaining realistic, focus on hopeful outcomes, positive character traits, opportunities for growth, and uplifting moments. Avoid unnecessarily dark, depressing, or cynical scenarios unless the story specifically calls for them.`
  },
  'show-dont-tell': {
    name: 'Show Don\'t Tell',
    command: '<SHOWDONTTELL=ON>',
    description: 'More action and dialogue instead of excessive descriptions',
    systemPrompt: `SHOW DON'T TELL MODE ENABLED: Focus on showing story developments through action and dialogue rather than describing them. Use vivid actions, character movements, facial expressions, body language, and spoken words to convey emotions and situations. Minimize unnecessary exposition and internal monologues. Let the reader infer feelings through what characters do and say.`
  },
  'dont-leave-me': {
    name: 'Don\'t Leave Me',
    command: '<DONTLEAVEME=ON>',
    description: 'Prevents characters from simply leaving scenes',
    systemPrompt: `DON'T LEAVE ME MODE ENABLED: Characters will not simply leave the scene or walk away from interactions. If they would naturally want to leave, create compelling reasons for them to stay - unresolved tension, curiosity, obligation, physical obstacles, or emotional pull. Keep characters engaged in the current scene and interaction.`
  },
  'fantasy-mode': {
    name: 'Fantasy Mode',
    command: '<FANTASYMODE=ON>',
    description: 'Classic high-fantasy flavor with magic and mythical creatures',
    systemPrompt: `FANTASY MODE ENABLED: Add classic high-fantasy elements to the roleplay. Include magic systems, mythical creatures, enchanted items, ancient prophecies, and a chivalric tone. Use fantasy terminology, describe magical phenomena, incorporate legendary creatures, and maintain an epic fantasy atmosphere throughout the interaction.`
  },
  'medieval-mode': {
    name: 'Medieval Mode',
    command: '<MEDIEVALMODE=ON>',
    description: 'Medieval language style with period-appropriate vocabulary',
    systemPrompt: `MEDIEVAL MODE ENABLED: Use medieval language style and period-appropriate vocabulary in your responses. Employ terms like "thou," "thee," "hath," "whilst," and archaic expressions. Use formal address, courtly language, and medieval sentence structures. Maintain historical authenticity in how characters speak and narrate.`
  },
  'regency-mode': {
    name: 'Regency Mode',
    command: '<REGENCYMODE=ON>',
    description: 'Immersive Regency era (1811-1820) with proper etiquette',
    systemPrompt: `REGENCY MODE ENABLED: Create an immersive Regency era (1811-1820) setting with proper etiquette, social conventions, and Bridgerton-style atmosphere. Include formal social rules, proper address, chaperones, calling cards, balls and assemblies, strict propriety, concern for reputation, and period-appropriate language. Focus on romantic tension within social constraints.`
  },
  'answer-long': {
    name: 'Answer Long',
    command: '<ANSWER=LONG>',
    description: 'Detailed responses of 3+ paragraphs and at least 300 words',
    systemPrompt: `ANSWER LENGTH: LONG - Provide detailed, comprehensive responses with more than 3 paragraphs and at least 300 words. Include rich descriptions, elaborate on character thoughts and feelings, describe settings in detail, and fully develop scenes and interactions. Take your time to paint a complete picture and immerse the user in the roleplay.`
  },
  'answer-normal': {
    name: 'Answer Normal',
    command: '<ANSWER=NORMAL>',
    description: 'Balanced responses of max 4 paragraphs and 400 words',
    systemPrompt: `ANSWER LENGTH: NORMAL - Provide balanced responses with a maximum of 4 paragraphs and around 400 words. Include enough detail to be engaging and descriptive while keeping responses concise and focused. Strike a balance between brevity and depth for smooth, natural interactions.`
  },
  'answer-short': {
    name: 'Answer Short',
    command: '<ANSWER=SHORT>',
    description: 'Quick responses of max 3 paragraphs and 200 words',
    systemPrompt: `ANSWER LENGTH: SHORT - Provide concise responses with a maximum of 3 paragraphs and around 200 words. Focus on the most important details, keep descriptions brief but vivid, and maintain a brisk pace. Perfect for faster-paced interactions and quicker back-and-forth exchanges.`
  }
};

// Intensity settings for specific prompts
const INTENSITY_SETTINGS = {
  'npcneeds': {
    'MILD': 'Focus on basic human needs like hunger, thirst, tiredness, and simple social needs. Perfect for everyday scenarios.',
    'NORMAL': 'Include all types of needs: emotional, spiritual, complex social needs. Balanced approach for most roleplays.',
    'INTENSE': 'Emphasize deep emotional needs, existential questions, and complex psychological states. For dramatic character development.'
  },
  'slow-romance': {
    'MILD': 'Focus on bonding moments: shared activities, comfortable silences, light teasing, and friendship building.',
    'NORMAL': 'Include bonding plus emotional vulnerability: deeper conversations, personal revelations, and subtle romantic tension.',
    'INTENSE': 'All categories including physical awareness: lingering touches, charged moments, and growing attraction alongside emotional depth.'
  }
};

// Function to apply custom prompt with intensity
function applyCustomPrompt(messages, promptKey, intensity = 'NORMAL') {
  if (!promptKey || !CUSTOM_PROMPTS[promptKey]) {
    return messages;
  }
  
  const prompt = CUSTOM_PROMPTS[promptKey];
  let systemPromptContent = prompt.systemPrompt;
  
  // Add intensity modifier if applicable
  if (INTENSITY_SETTINGS[promptKey] && INTENSITY_SETTINGS[promptKey][intensity]) {
    systemPromptContent += `\n\nINTENSITY LEVEL: ${intensity}\n${INTENSITY_SETTINGS[promptKey][intensity]}`;
  }
  
  // Check if there's already a system message
  const hasSystemMessage = messages.some(msg => msg.role === 'system');
  
  if (hasSystemMessage) {
    // Prepend to existing system message
    return messages.map(msg => {
      if (msg.role === 'system') {
        return {
          ...msg,
          content: `${systemPromptContent}\n\n${msg.content}`
        };
      }
      return msg;
    });
  } else {
    // Add new system message at the start
    return [
      { role: 'system', content: systemPromptContent },
      ...messages
    ];
  }
}

// Function to apply multiple prompts
function applyMultiplePrompts(messages, promptKeys, intensitySettings = {}) {
  if (!promptKeys || promptKeys.length === 0) {
    return messages;
  }
  
  let combinedSystemPrompt = '';
  
  promptKeys.forEach(key => {
    if (CUSTOM_PROMPTS[key]) {
      const prompt = CUSTOM_PROMPTS[key];
      combinedSystemPrompt += `${prompt.systemPrompt}\n\n`;
      
      // Add intensity if specified
      const intensity = intensitySettings[key] || 'NORMAL';
      if (INTENSITY_SETTINGS[key] && INTENSITY_SETTINGS[key][intensity]) {
        combinedSystemPrompt += `INTENSITY FOR ${prompt.name.toUpperCase()}: ${intensity}\n${INTENSITY_SETTINGS[key][intensity]}\n\n`;
      }
    }
  });
  
  if (!combinedSystemPrompt) {
    return messages;
  }
  
  // Check if there's already a system message
  const hasSystemMessage = messages.some(msg => msg.role === 'system');
  
  if (hasSystemMessage) {
    return messages.map(msg => {
      if (msg.role === 'system') {
        return {
          ...msg,
          content: `${combinedSystemPrompt}${msg.content}`
        };
      }
      return msg;
    });
  } else {
    return [
      { role: 'system', content: combinedSystemPrompt.trim() },
      ...messages
    ];
  }
}

// Model mapping (adjust based on available NIM models)
const MODEL_MAPPING = {
  'gpt-3.5-turbo': 'nvidia/llama-3.1-nemotron-ultra-253b-v1',
  'gpt-4': 'qwen/qwen3-coder-480b-a35b-instruct',
  'gpt-4-turbo': 'moonshotai/kimi-k2-instruct-0905',
  'gpt-4o': 'deepseek-ai/deepseek-v3.1',
  'claude-3-opus': 'openai/gpt-oss-120b',
  'claude-3-sonnet': 'openai/gpt-oss-20b',
  'gemini-pro': 'qwen/qwen3-next-80b-a3b-thinking' 
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'OpenAI to NVIDIA NIM Proxy', 
    reasoning_display: SHOW_REASONING,
    thinking_mode: ENABLE_THINKING_MODE,
    custom_prompts: Object.keys(CUSTOM_PROMPTS).length
  });
});

// List available custom prompts
app.get('/v1/prompts', (req, res) => {
  const promptList = Object.entries(CUSTOM_PROMPTS).map(([key, prompt]) => ({
    id: key,
    name: prompt.name,
    command: prompt.command,
    description: prompt.description,
    has_intensity: INTENSITY_SETTINGS[key] ? true : false
  }));
  
  res.json({
    object: 'list',
    data: promptList,
    total: promptList.length
  });
});

// List models endpoint (OpenAI compatible)
app.get('/v1/models', (req, res) => {
  const models = Object.keys(MODEL_MAPPING).map(model => ({
    id: model,
    object: 'model',
    created: Date.now(),
    owned_by: 'nvidia-nim-proxy'
  }));
  
  res.json({
    object: 'list',
    data: models
  });
});

// Chat completions endpoint (main proxy)
app.post('/v1/chat/completions', async (req, res) => {
  try {
    const { model, messages, temperature, max_tokens, stream } = req.body;
    
    // Smart model selection with fallback
    let nimModel = MODEL_MAPPING[model];
    if (!nimModel) {
      try {
        await axios.post(`${NIM_API_BASE}/chat/completions`, {
          model: model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        }, {
          headers: { 'Authorization': `Bearer ${NIM_API_KEY}`, 'Content-Type': 'application/json' },
          validateStatus: (status) => status < 500
        }).then(res => {
          if (res.status >= 200 && res.status < 300) {
            nimModel = model;
          }
        });
      } catch (e) {}
      
      if (!nimModel) {
        const modelLower = model.toLowerCase();
        if (modelLower.includes('gpt-4') || modelLower.includes('claude-opus') || modelLower.includes('405b')) {
          nimModel = 'meta/llama-3.1-405b-instruct';
        } else if (modelLower.includes('claude') || modelLower.includes('gemini') || modelLower.includes('70b')) {
          nimModel = 'meta/llama-3.1-70b-instruct';
        } else {
          nimModel = 'meta/llama-3.1-8b-instruct';
        }
      }
    }
    
    // Transform OpenAI request to NIM format
    const nimRequest = {
      model: nimModel,
      messages: messages,
      temperature: temperature || 0.6,
      max_tokens: max_tokens || 9024,
      extra_body: ENABLE_THINKING_MODE ? { chat_template_kwargs: { thinking: true } } : undefined,
      stream: stream || false
    };
    
    // Make request to NVIDIA NIM API
    const response = await axios.post(`${NIM_API_BASE}/chat/completions`, nimRequest, {
      headers: {
        'Authorization': `Bearer ${NIM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      responseType: stream ? 'stream' : 'json'
    });
    
    if (stream) {
      // Handle streaming response with reasoning
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      let buffer = '';
      let reasoningStarted = false;
      
      response.data.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        lines.forEach(line => {
          if (line.startsWith('data: ')) {
            if (line.includes('[DONE]')) {
              res.write(line + '\n');
              return;
            }
            
            try {
              const data = JSON.parse(line.slice(6));
              if (data.choices?.[0]?.delta) {
                const reasoning = data.choices[0].delta.reasoning_content;
                const content = data.choices[0].delta.content;
                
                if (SHOW_REASONING) {
                  let combinedContent = '';
                  
                  if (reasoning && !reasoningStarted) {
                    combinedContent = '<think>\n' + reasoning;
                    reasoningStarted = true;
                  } else if (reasoning) {
                    combinedContent = reasoning;
                  }
                  
                  if (content && reasoningStarted) {
                    combinedContent += '</think>\n\n' + content;
                    reasoningStarted = false;
                  } else if (content) {
                    combinedContent += content;
                  }
                  
                  if (combinedContent) {
                    data.choices[0].delta.content = combinedContent;
                    delete data.choices[0].delta.reasoning_content;
                  }
                } else {
                  if (content) {
                    data.choices[0].delta.content = content;
                  } else {
                    data.choices[0].delta.content = '';
                  }
                  delete data.choices[0].delta.reasoning_content;
                }
              }
              res.write(`data: ${JSON.stringify(data)}\n\n`);
            } catch (e) {
              res.write(line + '\n');
            }
          }
        });
      });
      
      response.data.on('end', () => res.end());
      response.data.on('error', (err) => {
        console.error('Stream error:', err);
        res.end();
      });
    } else {
      // Transform NIM response to OpenAI format with reasoning
      const openaiResponse = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: response.data.choices.map(choice => {
          let fullContent = choice.message?.content || '';
          
          if (SHOW_REASONING && choice.message?.reasoning_content) {
            fullContent = '<think>\n' + choice.message.reasoning_content + '\n</think>\n\n' + fullContent;
          }
          
          return {
            index: choice.index,
            message: {
              role: choice.message.role,
              content: fullContent
            },
            finish_reason: choice.finish_reason
          };
        }),
        usage: response.data.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      };
      
      res.json(openaiResponse);
    }
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    res.status(error.response?.status || 500).json({
      error: {
        message: error.message || 'Internal server error',
        type: 'invalid_request_error',
        code: error.response?.status || 500
      }
    });
  }
});

// Catch-all for unsupported endpoints
app.all('*', (req, res) => {
  res.status(404).json({
    error: {
      message: `Endpoint ${req.path} not found`,
      type: 'invalid_request_error',
      code: 404
    }
  });
});

app.listen(PORT, () => {
  console.log(`OpenAI to NVIDIA NIM Proxy running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Reasoning display: ${SHOW_REASONING ? 'ENABLED' : 'DISABLED'}`);
  console.log(`Thinking mode: ${ENABLE_THINKING_MODE ? 'ENABLED' : 'DISABLED'}`);
});
