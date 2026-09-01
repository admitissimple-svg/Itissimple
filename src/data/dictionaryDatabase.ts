import { StudentDictionaryEntry } from '../types';

export const COMMON_ROUTINE_DICTIONARY: Record<string, Omit<StudentDictionaryEntry, 'id'>> = {
  brew: {
    word: 'brew',
    partOfSpeech: 'verb',
    definitionEn: 'To make beer, coffee, or tea by soaking, boiling, or steeping ingredients in hot water.',
    exampleSentenceEn: 'I brew fresh organic coffee every morning at 7:00 AM.',
    translationPt: 'Preparar / fazer (café, chá ou cerveja)',
  },
  pour: {
    word: 'pour',
    partOfSpeech: 'verb',
    definitionEn: 'To cause a liquid to flow from a container in a steady stream.',
    exampleSentenceEn: 'She poured the freshly brewed tea into her favorite ceramic mug.',
    translationPt: 'Despejar / servir (líquido)',
  },
  mug: {
    word: 'mug',
    partOfSpeech: 'noun',
    definitionEn: 'A large cup with straight sides and a handle, typically used for hot beverages like coffee or tea.',
    exampleSentenceEn: 'He held the warm mug between his hands on a chilly morning.',
    translationPt: 'Caneca',
  },
  toast: {
    word: 'toast',
    partOfSpeech: 'noun / verb',
    definitionEn: 'Sliced bread that has been browned and crisped by exposure to heat.',
    exampleSentenceEn: 'I had two slices of whole wheat toast with butter and jam.',
    translationPt: 'Torrada / torrar',
  },
  sip: {
    word: 'sip',
    partOfSpeech: 'verb / noun',
    definitionEn: 'To drink something by taking small mouthfuls slowly.',
    exampleSentenceEn: 'She sat on the balcony and took a quiet sip of hot coffee.',
    translationPt: 'Beber em pequenos goles / dar um gole',
  },
  skillet: {
    word: 'skillet',
    partOfSpeech: 'noun',
    definitionEn: 'A flat-bottomed pan used for frying, searing, and browning foods.',
    exampleSentenceEn: 'He heated a little olive oil in the skillet to cook scrambled eggs.',
    translationPt: 'Frigideira',
  },
  'scrambled eggs': {
    word: 'scrambled eggs',
    partOfSpeech: 'noun phrase',
    definitionEn: 'Eggs beaten together with a little milk or water and cooked gently while stirring.',
    exampleSentenceEn: 'Scrambled eggs with a pinch of black pepper are my go-to breakfast.',
    translationPt: 'Ovos mexidos',
  },
  oatmeal: {
    word: 'oatmeal',
    partOfSpeech: 'noun',
    definitionEn: 'A warm porridge made from rolled or ground oats boiled in milk or water.',
    exampleSentenceEn: 'Eating a bowl of warm oatmeal with berries gives me sustained energy.',
    translationPt: 'Mingau de aveia',
  },
  commute: {
    word: 'commute',
    partOfSpeech: 'noun / verb',
    definitionEn: 'The daily journey from home to work or school, or the action of traveling that distance.',
    exampleSentenceEn: 'My morning commute on the subway takes about 25 minutes.',
    translationPt: 'Trajeto casa-trabalho / deslocamento diário',
  },
  subway: {
    word: 'subway',
    partOfSpeech: 'noun',
    definitionEn: 'An underground electric railway system used for public urban transit.',
    exampleSentenceEn: 'I boarded the subway at Paulista station and read my notes.',
    translationPt: 'Metrô subterrâneo',
  },
  headphones: {
    word: 'headphones',
    partOfSpeech: 'noun',
    definitionEn: 'A pair of small speakers worn over or in the ears to listen to audio privately.',
    exampleSentenceEn: 'I put on my noise-canceling headphones to listen to an English podcast.',
    translationPt: 'Fones de ouvido',
  },
  forecast: {
    word: 'forecast',
    partOfSpeech: 'noun / verb',
    definitionEn: 'A prediction or estimate of future events, especially regarding coming weather.',
    exampleSentenceEn: 'The morning weather forecast predicted sunny skies and mild temperatures.',
    translationPt: 'Previsão (do tempo)',
  },
  stretch: {
    word: 'stretch',
    partOfSpeech: 'verb / noun',
    definitionEn: 'To straighten or extend one\'s body or limbs to full length to improve flexibility.',
    exampleSentenceEn: 'Taking five minutes to stretch before working out relieves muscle stiffness.',
    translationPt: 'Alongar / alongamento',
  },
  workout: {
    word: 'workout',
    partOfSpeech: 'noun',
    definitionEn: 'A session of physical exercise or training aimed at fitness and strength.',
    exampleSentenceEn: 'A high-intensity workout early in the morning boosts my mood for hours.',
    translationPt: 'Treino / sessão de exercícios',
  },
  deadline: {
    word: 'deadline',
    partOfSpeech: 'noun',
    definitionEn: 'The latest time or date by which something must be finished or submitted.',
    exampleSentenceEn: 'Our team worked diligently to meet the Friday project deadline.',
    translationPt: 'Prazo limite / data de entrega',
  },
  brainstorm: {
    word: 'brainstorm',
    partOfSpeech: 'verb / noun',
    definitionEn: 'To produce spontaneous ideas or solutions through collective discussion.',
    exampleSentenceEn: 'We gathered in the meeting room to brainstorm new marketing angles.',
    translationPt: 'Fazer tempestade de ideias / debater ideias',
  },
  agenda: {
    word: 'agenda',
    partOfSpeech: 'noun',
    definitionEn: 'A structured list of items, topics, or goals to be discussed in a formal meeting.',
    exampleSentenceEn: 'The chairperson reviewed the three key items on today\'s meeting agenda.',
    translationPt: 'Pauta de reunião / agenda',
  },
  groceries: {
    word: 'groceries',
    partOfSpeech: 'noun plural',
    definitionEn: 'Food and other everyday household necessities bought at a store or supermarket.',
    exampleSentenceEn: 'I stopped by the organic market to pick up fresh groceries for dinner.',
    translationPt: 'Compras de mercado / mantimentos',
  },
  recipe: {
    word: 'recipe',
    partOfSpeech: 'noun',
    definitionEn: 'A set of instructions describing how to prepare and cook a particular dish.',
    exampleSentenceEn: 'She followed a traditional Italian recipe for homemade tomato sauce.',
    translationPt: 'Receita culinária',
  },
  wind_down: {
    word: 'wind down',
    partOfSpeech: 'phrasal verb',
    definitionEn: 'To gradually relax, slow down, and prepare for rest after a busy or intense day.',
    exampleSentenceEn: 'Dimming the lights and reading a good book helps me wind down before bed.',
    translationPt: 'Desacelerar / relaxar ao final do dia',
  },
  journal: {
    word: 'journal',
    partOfSpeech: 'noun / verb',
    definitionEn: 'A personal diary or record where one writes daily reflections, experiences, and thoughts.',
    exampleSentenceEn: 'Writing one sentence in my English journal every night keeps my practice consistent.',
    translationPt: 'Diário pessoal / registrar reflexões',
  },
  gratitude: {
    word: 'gratitude',
    partOfSpeech: 'noun',
    definitionEn: 'The quality or feeling of being thankful and showing appreciation for life and others.',
    exampleSentenceEn: 'Expressing gratitude for small daily moments creates a positive mindset.',
    translationPt: 'Gratidão',
  },
};

export function getDictionaryDefinition(word: string, context?: string): Omit<StudentDictionaryEntry, 'id'> {
  const cleanKey = word.toLowerCase().trim();
  
  if (COMMON_ROUTINE_DICTIONARY[cleanKey]) {
    return COMMON_ROUTINE_DICTIONARY[cleanKey];
  }

  // Fallback pedagogical generator for any English word
  const capitalizedWord = word.charAt(0).toUpperCase() + word.slice(1);
  return {
    word: word.trim(),
    partOfSpeech: 'word / expression',
    definitionEn: `Key English vocabulary used in daily conversational context: ${context ? `related to ${context}` : 'practiced in everyday life'}.`,
    exampleSentenceEn: `I practiced using "${word.trim()}" in my daily English routine today.`,
    translationPt: `Expressão ou termo prático em inglês`,
  };
}
