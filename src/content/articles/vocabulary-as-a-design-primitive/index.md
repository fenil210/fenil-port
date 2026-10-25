---
title: "Vocabulary as a Design Primitive"
description: "Vocabulary in AI engineering isn’t just semantics. The words drive the decisions."
date: 2026-04-25
x: https://x.com/fenillramoliya/status/2047996494146687354
cover: ./cover.jpg
coverAlt: "Series card: Field Notes: AI Engineering, 1.2, The Vocabulary."
series: "1.2"
---
The same word means three different things depending on who's in the room. "Context" to a product manager is the background you give the model. To an infra engineer it's the token budget. To a researcher it's the attention mechanism. All three are technically right, and if you're building a system with all three people involved, you're going to have some fun meetings.

Vocabulary in AI engineering isn't just semantics. The words drive the decisions. When you can name a thing precisely, you design around it precisely. When you can't, you build on assumptions that hold up fine until they don't.

[1.1](/articles/workflow-agent-or-multi-agent/) briefly introduced five components every AI system has: model, memory, tools, controller, environment. This article is about the vocabulary that makes those components make sense, specifically the parts that actually change how you build and interact with such systems.

Start with tokens, because a token is not a word. Type "unbelievable" into a tokenizer and you get three tokens: "un", "believ", "able". Type "GPT" and you get one. The model never reads language the way you do. It reads token IDs, integer representations of these sub-word fragments, and everything downstream flows from that. 

Tokenization efficiency varies significantly across different languages, which directly impacts your processing expenses. Languages with complex morphology, such as Turkish or Malayalam, tokenize less efficiently than English. You end up paying for way more tokens to process the exact same sentence. Chinese does the opposite. The characters are so dense with meaning that it uses fewer tokens than English and actually saves you money, woah! You definitely want to know this before launching globally and panicking over weird regional billing spikes. 

The token becomes an embedding inside the model, and those are not the same thing. The embedding is a dense vector, a long list of numbers representing meaning in high-dimensional space. The famous example is "king minus man plus woman equals queen" in embedding space. Every AI intro ever uses that line. THE practical version: embeddings are what make semantic search work, because similar meanings land close together in that space rather than requiring exact keyword matches. The model reasons about relationships, not characters. 

Then generated text, which is different from both. The model doesn't produce words directly. It produces probability distributions over the vocabulary at each step, picks a token and repeats. What you read at the end is a decoded sequence. The full flow is: your text gets split into tokens, tokens become embeddings, the model processes through its layers, and the output travels back from embeddings to tokens to readable text. The understanding of the chain is very important for interpreting how the model arrives at its outputs and for diagnosing errors or unexpected behavior in its responses.

Now the context window, because this is where a lot of plans meet reality. The context window is the hard limit on how many tokens the model can process in a single call. GPT-4o used to handle 128k tokens, Claude-4.5-haiku handles 200k, Gemini-3.1-pro and GPT-5.4 go up to 1M. Those are large numbers. What you actually have to work with is smaller. 

```

Context Window (e.g. 128,000 tokens)
├── System Prompt          ~500–2,000 tokens
├── Conversation History   ~1,000–10,000 tokens
├── Retrieved Documents    ~2,000–20,000 tokens
├── Tool Results           ~500–5,000 tokens
└── Room for Output        ~1,000–4,000 tokens
                           ─────────────────────
                           What's left for you to fill? Less than you think.
```

Your working context is the system prompt + conversation history + retrieved documents content + tool results + room left for model to respond. By the time you've loaded a reasonable system prompt, a few turns of conversation, and a couple of retrieved documents, you've consumed a significant portion of that window before the model has said a word. The skill of managing this budget deliberately is called context engineering. It shows up in [1.1](/articles/workflow-agent-or-multi-agent/) as one of the things that matters more than which model you chose and that framing was not casual. 

The knowledge freshness problem is the one that surfaces quietly in production. The model's training data has a cutoff, usually 4 to 8 months before you're using it. Everything after that date simply doesn't exist to it. Your retrieval layer is only as fresh as the last time you indexed your documents, weekly, daily or real-time depending on how you built it. And live tool data, a search result from 30 seconds ago, a database query, a live API response, is the only truly "current" information in the system.

The confusion comes from not tracking which tier a piece of information is coming from. Ask the model about something that changes after its cutoff and it will answer confidently and incorrectly. It's not trying to mislead you. It's doing exactly what it was trained to do:  generating the most plausible continuation of your prompt based on what it saw during training. The information is just old. The confidence is not.

Back to the five components from [1.1](/articles/workflow-agent-or-multi-agent/), specifically memory. Context, memory and knowledge base are not interchangeable, even though all three involve information the system knows.

Context is what's in the model's window right now, ephemeral, gone when the call ends. Memory is what the system persists across calls, stored somewhere external, loaded back in when relevant. The knowledge base is the curated body of information your system is built to reason over: your company's documents, your product catalog, a research paper you're reading. The relationship: the knowledge base feeds memory, memory gets selectively loaded into context when needed. Each step is a filter. Understanding this distinction is what separates "I added a vector database" from "I designed a memory architecture".

The last one worth naming: prompt engineering and context engineering are not the same thing. Prompt engineering is writing a good instruction for a single model call. Context engineering is orchestrating everything that goes into the full context window across an entire interaction, managing memory, retrieved documents, conversation history, system prompts, and tool results simultaneously. One is writing skill. The other is a systems design problem. Conflating them produces approaches that work well in a notebook and fall apart in production :)

These words are terrain. Every article after this one in this series assumes you have them. 

Some starting point if you're interested in visual learning : <https://www.youtube.com/watch?v=LPZh9BOjkQs> and <https://www.youtube.com/watch?v=zduSFxRajkE>

More on Memory here for **Multi-Agent System**: <https://x.com/mem0ai/status/2045519377655890111?s=20>

*Field Notes: AI Engineering — 1.2*

*Previously :* [*1.1 What is an AI System?*](/articles/workflow-agent-or-multi-agent/)

*Up in 1.3: nine decisions that define every AI system before you write a line of code.*
