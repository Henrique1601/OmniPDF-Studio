import { GoogleGenAI } from '@google/genai';
import { AIProviderType } from '../types';

export class AIService {
  static getProvider(): AIProviderType {
    return (localStorage.getItem('omnipdf_ai_provider') as AIProviderType) || 'gemini';
  }

  static getGeminiApiKey(): string {
    return localStorage.getItem('omnipdf_gemini_api_key') || '';
  }

  static getOllamaUrl(): string {
    return localStorage.getItem('omnipdf_ollama_url') || 'http://localhost:11434';
  }

  static getOllamaModel(): string {
    return localStorage.getItem('omnipdf_ollama_model') || 'llama3';
  }

  static hasConfiguredAI(): boolean {
    const provider = this.getProvider();
    if (provider === 'gemini') {
      return !!this.getGeminiApiKey().trim();
    }
    if (provider === 'ollama') {
      return !!this.getOllamaUrl().trim();
    }
    return false;
  }

  /**
   * Testa a conexão com o provedor de IA selecionado
   */
  static async testConnection(): Promise<{ success: boolean; message: string; model?: string }> {
    const provider = this.getProvider();

    if (provider === 'gemini') {
      const apiKey = this.getGeminiApiKey().trim();
      if (!apiKey) {
        return { success: false, message: 'Nenhuma chave Gemini API configurada.' };
      }
      try {
        const ai = new GoogleGenAI({ apiKey });
        const res = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: 'Responda apenas: OK',
        });
        if (res.text) {
          return { success: true, message: 'Conexão com Gemini 2.5 Flash estabelecida com sucesso!', model: 'gemini-2.5-flash' };
        }
        return { success: false, message: 'Resposta vazia do Gemini.' };
      } catch (err: any) {
        return { success: false, message: `Erro ao conectar com Gemini: ${err.message}` };
      }
    }

    if (provider === 'ollama') {
      const url = this.getOllamaUrl().trim().replace(/\/$/, '');
      const model = this.getOllamaModel().trim() || 'llama3';

      try {
        // Test tags endpoint
        const tagRes = await fetch(`${url}/api/tags`, { method: 'GET' });
        if (!tagRes.ok) {
          throw new Error(`Ollama respondeu com status ${tagRes.status}`);
        }
        const data = await tagRes.json();
        const models = (data.models || []).map((m: any) => m.name);
        const hasModel = models.some((m: string) => m.startsWith(model));

        return {
          success: true,
          message: hasModel 
            ? `Ollama online! Modelo "${model}" pronto para uso local.`
            : `Ollama online! Modelos encontrados: ${models.join(', ') || 'Nenhum'}. Certifique-se de ter executado 'ollama pull ${model}'.`,
          model: models[0] || model
        };
      } catch (err: any) {
        return {
          success: false,
          message: `Falha ao alcançar Ollama em ${url}. Verifique se o Ollama está rodando ('ollama serve'). Detalhes: ${err.message}`
        };
      }
    }

    return { success: true, message: 'Motor Heurístico Offline embutido ativo.' };
  }

  /**
   * Gera conteúdo via Gemini ou Ollama
   */
  static async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const provider = this.getProvider();

    if (provider === 'gemini') {
      const apiKey = this.getGeminiApiKey().trim();
      if (!apiKey) {
        throw new Error('Chave Gemini API não configurada. Acesse Configurações para adicionar.');
      }
      const ai = new GoogleGenAI({ apiKey });
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
      });
      return res.text || '';
    }

    if (provider === 'ollama') {
      const url = this.getOllamaUrl().trim().replace(/\/$/, '');
      const model = this.getOllamaModel().trim() || 'llama3';

      const res = await fetch(`${url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          system: systemPrompt,
          stream: false,
        }),
      });

      if (!res.ok) {
        throw new Error(`Erro no Ollama (${res.status}): ${await res.text()}`);
      }

      const data = await res.json();
      return data.response || '';
    }

    throw new Error('Nenhum provedor de IA online/local disponível.');
  }
}
