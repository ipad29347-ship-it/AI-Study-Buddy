import { pipeline, env } from '@huggingface/transformers';

// Disable local models, use Hugging Face CDN
env.allowLocalModels = false;

class PipelineSingleton {
  static summarizer: any = null;
  static ner: any = null;

  static async getSummarizer(progress_callback: any) {
    if (this.summarizer === null) {
      this.summarizer = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6', { progress_callback });
    }
    return this.summarizer;
  }

  static async getNer(progress_callback: any) {
    if (this.ner === null) {
      this.ner = await pipeline('token-classification', 'Xenova/bert-base-NER', { progress_callback });
    }
    return this.ner;
  }
}

self.addEventListener('message', async (event) => {
  const { type, text, id } = event.data;

  try {
    if (type === 'generate') {
      // 1. Generate Summary
      const summarizer = await PipelineSingleton.getSummarizer((x: any) => {
        self.postMessage({ status: 'progress', task: 'Loading Summarizer', data: x, id });
      });

      self.postMessage({ status: 'progress', task: 'Generating Summary...', data: { status: 'generating' }, id });
      
      const summaryResult = await summarizer(text, {
        max_new_tokens: 150,
        min_new_tokens: 30,
      });
      const summary = summaryResult[0].summary_text;

      // 2. Extract Entities for Flashcards & Quizzes
      const ner = await PipelineSingleton.getNer((x: any) => {
        self.postMessage({ status: 'progress', task: 'Loading NER Model', data: x, id });
      });

      self.postMessage({ status: 'progress', task: 'Extracting Concepts...', data: { status: 'generating' }, id });
      
      const entities = await ner(summary);
      
      // Process entities to create flashcards
      const flashcards: any[] = [];
      const quizzes: any[] = [];
      
      // Group contiguous entities
      let currentEntity = '';
      let currentType = '';
      const uniqueEntities = new Map();

      for (const entity of entities) {
        const word = entity.word.replace(/^##/, '');
        if (entity.entity.startsWith('B-')) {
          if (currentEntity) uniqueEntities.set(currentEntity, currentType);
          currentEntity = word;
          currentType = entity.entity.substring(2);
        } else if (entity.entity.startsWith('I-')) {
          currentEntity += (entity.word.startsWith('##') ? word : ' ' + word);
        }
      }
      if (currentEntity) uniqueEntities.set(currentEntity, currentType);

      // Create flashcards from sentences containing entities
      const sentences = summary.match(/[^.!?]+[.!?]+/g) || [summary];
      
      sentences.forEach((sentence: string, index: number) => {
        let foundEntity = '';
        for (const [entity, type] of uniqueEntities.entries()) {
          if (entity.length > 2 && sentence.includes(entity)) {
            foundEntity = entity;
            break;
          }
        }

        if (foundEntity) {
          flashcards.push({
            id: `fc-${index}`,
            question: sentence.replace(foundEntity, '________'),
            answer: foundEntity,
            mastery: 0
          });

          // Generate a simple MCQ
          const distractors = Array.from(uniqueEntities.keys())
            .filter(e => e !== foundEntity && e.length > 2)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);
            
          // If not enough distractors, add generic ones
          while(distractors.length < 3) {
            distractors.push(['Photosynthesis', 'Gravity', 'Democracy', 'Algebra'][Math.floor(Math.random()*4)]);
          }

          const options = [foundEntity, ...distractors].sort(() => 0.5 - Math.random());

          quizzes.push({
            id: `qz-${index}`,
            question: `Fill in the blank: ${sentence.replace(foundEntity, '________')}`,
            options,
            correctAnswer: foundEntity,
            explanation: `The correct answer is ${foundEntity} because it fits the context of the summary.`
          });
        }
      });

      self.postMessage({
        status: 'complete',
        id,
        result: {
          summary,
          flashcards,
          quizzes
        }
      });
    }
  } catch (error: any) {
    self.postMessage({ status: 'error', id, error: error.message });
  }
});
