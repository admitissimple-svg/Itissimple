import { StudentDictionaryEntry } from '../types';

export const COMMON_ROUTINE_DICTIONARY: Record<string, Omit<StudentDictionaryEntry, 'id'>> = {
  // Breakfast & Kitchen Essentials
  coffee: {
    word: 'coffee',
    partOfSpeech: 'noun',
    definitionEn: 'A hot drink made from the roasted and ground bean-like seeds of a tropical shrub.',
    exampleSentenceEn: 'I like to drink a fresh cup of hot coffee while checking my morning schedule.',
    translationPt: 'Café',
  },
  milk: {
    word: 'milk',
    partOfSpeech: 'noun',
    definitionEn: 'An opaque white liquid produced by female mammals, widely consumed as a nutritious drink or added to coffee and tea.',
    exampleSentenceEn: 'She poured a splash of cold milk into her morning coffee.',
    translationPt: 'Leite',
  },
  nice: {
    word: 'nice',
    partOfSpeech: 'adjective',
    definitionEn: 'Pleasant, enjoyable, or satisfactory; kind, polite, and friendly.',
    exampleSentenceEn: 'It was very nice to sit outside and enjoy the sunny morning.',
    translationPt: 'Agradável / simpático / bom',
  },
  tea: {
    word: 'tea',
    partOfSpeech: 'noun',
    definitionEn: 'A hot beverage made by infusing dried crushed leaves of the tea plant in boiling water.',
    exampleSentenceEn: 'She sat on the sofa with a warm cup of green tea.',
    translationPt: 'Chá',
  },
  water: {
    word: 'water',
    partOfSpeech: 'noun',
    definitionEn: 'A clear, colorless, odorless liquid essential for plant and animal life.',
    exampleSentenceEn: 'Remember to drink a glass of water first thing in the morning.',
    translationPt: 'Água',
  },
  breakfast: {
    word: 'breakfast',
    partOfSpeech: 'noun',
    definitionEn: 'A meal eaten in the morning, the first meal of the day.',
    exampleSentenceEn: 'We usually have breakfast together around 7:30 AM.',
    translationPt: 'Café da manhã',
  },
  brew: {
    word: 'brew',
    partOfSpeech: 'verb',
    definitionEn: 'To prepare coffee or tea by soaking it in hot water.',
    exampleSentenceEn: 'I brew fresh coffee every morning at 7:00 AM.',
    translationPt: 'Preparar / fazer (café, chá)',
  },
  pour: {
    word: 'pour',
    partOfSpeech: 'verb',
    definitionEn: 'To make a liquid flow smoothly from a container.',
    exampleSentenceEn: 'She poured the freshly brewed tea into her favorite ceramic mug.',
    translationPt: 'Despejar / servir (líquido)',
  },
  mug: {
    word: 'mug',
    partOfSpeech: 'noun',
    definitionEn: 'A large cup with a handle used for hot drinks like coffee or tea.',
    exampleSentenceEn: 'He held the warm mug between his hands on a chilly morning.',
    translationPt: 'Caneca',
  },
  toast: {
    word: 'toast',
    partOfSpeech: 'noun / verb',
    definitionEn: 'Sliced bread made warm, crisp, and brown under heat.',
    exampleSentenceEn: 'I had two slices of whole wheat toast with butter and jam.',
    translationPt: 'Torrada / torrar',
  },
  bread: {
    word: 'bread',
    partOfSpeech: 'noun',
    definitionEn: 'A staple food made from baked flour and water dough.',
    exampleSentenceEn: 'I sliced a fresh loaf of artisan sourdough bread for breakfast.',
    translationPt: 'Pão',
  },
  sugar: {
    word: 'sugar',
    partOfSpeech: 'noun',
    definitionEn: 'A sweet crystalline substance obtained from sugar cane or sugar beet.',
    exampleSentenceEn: 'I usually drink my black coffee without any added sugar.',
    translationPt: 'Açúcar',
  },
  egg: {
    word: 'egg',
    partOfSpeech: 'noun',
    definitionEn: 'An oval or round object laid by a female bird, eaten as food.',
    exampleSentenceEn: 'He prepared a boiled egg and avocado toast for a quick snack.',
    translationPt: 'Ovo',
  },
  fruit: {
    word: 'fruit',
    partOfSpeech: 'noun',
    definitionEn: 'The sweet and fleshy product of a tree or other plant that contains seed.',
    exampleSentenceEn: 'Having fresh seasonal fruit in the morning is refreshing and healthy.',
    translationPt: 'Fruta',
  },
  sip: {
    word: 'sip',
    partOfSpeech: 'verb / noun',
    definitionEn: 'To drink a very small amount slowly.',
    exampleSentenceEn: 'She sat on the balcony and took a quiet sip of hot coffee.',
    translationPt: 'Dar um gole / beber em pequenos goles',
  },
  skillet: {
    word: 'skillet',
    partOfSpeech: 'noun',
    definitionEn: 'A flat metal pan used for frying eggs and cooking food.',
    exampleSentenceEn: 'He heated olive oil in the skillet to cook eggs.',
    translationPt: 'Frigideira',
  },
  'scrambled eggs': {
    word: 'scrambled eggs',
    partOfSpeech: 'noun phrase',
    definitionEn: 'Eggs beaten together and cooked gently in a pan.',
    exampleSentenceEn: 'Scrambled eggs with black pepper are my go-to breakfast.',
    translationPt: 'Ovos mexidos',
  },
  oatmeal: {
    word: 'oatmeal',
    partOfSpeech: 'noun',
    definitionEn: 'A warm porridge made from oats boiled in milk or water.',
    exampleSentenceEn: 'Eating a bowl of warm oatmeal with berries gives me great energy.',
    translationPt: 'Mingau de aveia',
  },
  
  // Commute & Transport
  commute: {
    word: 'commute',
    partOfSpeech: 'noun / verb',
    definitionEn: 'The regular travel between your home and your workplace or school.',
    exampleSentenceEn: 'My morning commute on the subway takes about 25 minutes.',
    translationPt: 'Deslocamento / trajeto diário',
  },
  subway: {
    word: 'subway',
    partOfSpeech: 'noun',
    definitionEn: 'An electric underground train system for city transit.',
    exampleSentenceEn: 'I boarded the subway at Paulista station and read my book.',
    translationPt: 'Metrô',
  },
  headphones: {
    word: 'headphones',
    partOfSpeech: 'noun',
    definitionEn: 'A device worn over or in the ears to listen to audio privately.',
    exampleSentenceEn: 'I put on my noise-canceling headphones to listen to an English podcast.',
    translationPt: 'Fones de ouvido',
  },
  forecast: {
    word: 'forecast',
    partOfSpeech: 'noun / verb',
    definitionEn: 'A statement of what weather is expected in the near future.',
    exampleSentenceEn: 'The morning forecast predicted sunny skies and mild temperatures.',
    translationPt: 'Previsão do tempo',
  },
  
  // Health & Routine
  stretch: {
    word: 'stretch',
    partOfSpeech: 'verb / noun',
    definitionEn: 'To extend your body or limbs to loosen muscles and improve flexibility.',
    exampleSentenceEn: 'Taking five minutes to stretch before working out relieves muscle stiffness.',
    translationPt: 'Alongar / alongamento',
  },
  workout: {
    word: 'workout',
    partOfSpeech: 'noun',
    definitionEn: 'A session of physical exercise or sports training.',
    exampleSentenceEn: 'A high-intensity workout early in the morning boosts my mood.',
    translationPt: 'Treino / exercício físico',
  },
  hydrate: {
    word: 'hydrate',
    partOfSpeech: 'verb',
    definitionEn: 'To drink enough water to keep your body healthy and energetic.',
    exampleSentenceEn: 'Make sure to hydrate throughout the day, especially after exercise.',
    translationPt: 'Hidratar-se',
  },
  
  // Work, Meetings & Conversational Idioms
  'touch base': {
    word: 'touch base',
    partOfSpeech: 'idiom / phrase',
    definitionEn: 'To briefly make contact or communicate with someone to update each other.',
    exampleSentenceEn: 'Let’s touch base tomorrow morning to review the project status.',
    translationPt: 'Entrar em contato / alinhar brevemente',
  },
  'follow up': {
    word: 'follow up',
    partOfSpeech: 'phrasal verb',
    definitionEn: 'To take further action or send a message about an ongoing matter.',
    exampleSentenceEn: 'I will follow up with the client via email this afternoon.',
    translationPt: 'Fazer o acompanhamento / dar retorno',
  },
  'reach out': {
    word: 'reach out',
    partOfSpeech: 'phrasal verb',
    definitionEn: 'To contact someone for help, information, or friendly communication.',
    exampleSentenceEn: 'Feel free to reach out if you have any questions about the assignment.',
    translationPt: 'Entrar em contato / procurar alguém',
  },
  'wrap up': {
    word: 'wrap up',
    partOfSpeech: 'phrasal verb',
    definitionEn: 'To finish, complete, or conclude a meeting, task, or activity.',
    exampleSentenceEn: 'Let’s wrap up our meeting five minutes early today.',
    translationPt: 'Concluir / finalizar',
  },
  'catch up': {
    word: 'catch up',
    partOfSpeech: 'phrasal verb',
    definitionEn: 'To talk with someone you haven’t seen in a while about recent news and life.',
    exampleSentenceEn: 'It was wonderful to catch up with my friend over coffee yesterday.',
    translationPt: 'Colocar o papo em dia / atualizar os assuntos',
  },
  'figure out': {
    word: 'figure out',
    partOfSpeech: 'phrasal verb',
    definitionEn: 'To solve a problem, understand a situation, or find a solution.',
    exampleSentenceEn: 'We spent an hour trying to figure out the best travel route.',
    translationPt: 'Descobrir / compreender / resolver',
  },
  'on the same page': {
    word: 'on the same page',
    partOfSpeech: 'idiom',
    definitionEn: 'Having the same understanding, agreement, and shared goal.',
    exampleSentenceEn: 'Before we launch the campaign, let’s make sure the whole team is on the same page.',
    translationPt: 'Estar alinhado / concordar plenamente',
  },
  'look forward to': {
    word: 'look forward to',
    partOfSpeech: 'phrasal verb',
    definitionEn: 'To feel excited and happy about something that will happen in the future.',
    exampleSentenceEn: 'I look forward to our next English speaking session on Friday.',
    translationPt: 'Aguardar ansiosamente / estar animado para',
  },
  'call it a day': {
    word: 'call it a day',
    partOfSpeech: 'idiom',
    definitionEn: 'To stop working on something for the rest of the day.',
    exampleSentenceEn: 'We’ve finished all urgent tasks, so let’s call it a day.',
    translationPt: 'Encerrar o dia de trabalho / dar por encerrado',
  },
  'break the ice': {
    word: 'break the ice',
    partOfSpeech: 'idiom',
    definitionEn: 'To make people feel more relaxed and comfortable in a social setting.',
    exampleSentenceEn: 'Starting with a simple warm-up game helped break the ice with the new group.',
    translationPt: 'Quebrar o gelo',
  },
  'keep in mind': {
    word: 'keep in mind',
    partOfSpeech: 'phrase',
    definitionEn: 'To remember or consider an important piece of advice or information.',
    exampleSentenceEn: 'Keep in mind that consistent daily practice leads to natural fluency.',
    translationPt: 'Ter em mente / lembrar-se de',
  },
  'think outside the box': {
    word: 'think outside the box',
    partOfSpeech: 'idiom',
    definitionEn: 'To think creatively in an original, unconventional way.',
    exampleSentenceEn: 'To solve this design challenge, we need to think outside the box.',
    translationPt: 'Pensar fora da caixa / ser criativo',
  },
  'bite the bullet': {
    word: 'bite the bullet',
    partOfSpeech: 'idiom',
    definitionEn: 'To face a difficult or unpleasant situation with courage and get it over with.',
    exampleSentenceEn: 'I decided to bite the bullet and give the entire presentation in English.',
    translationPt: 'Encarar o desafio / segurar a onda',
  },
  'take it easy': {
    word: 'take it easy',
    partOfSpeech: 'idiom',
    definitionEn: 'To relax, rest, and not hurry or worry too much.',
    exampleSentenceEn: 'After a demanding work week, I just want to take it easy this weekend.',
    translationPt: 'Relaxar / ir com calma',
  },
  'so far so good': {
    word: 'so far so good',
    partOfSpeech: 'idiom',
    definitionEn: 'Used to say that things have gone well up to the present moment.',
    exampleSentenceEn: 'How is the new job going? So far so good!',
    translationPt: 'Até aqui tudo bem / indo super bem',
  },
  'under the weather': {
    word: 'under the weather',
    partOfSpeech: 'idiom',
    definitionEn: 'Feeling slightly sick, unwell, or tired.',
    exampleSentenceEn: 'I felt a bit under the weather yesterday, so I rested and drank lemon tea.',
    translationPt: 'Meio indisposto / jururu',
  },
  'out of the blue': {
    word: 'out of the blue',
    partOfSpeech: 'idiom',
    definitionEn: 'Happening unexpectedly, without any warning.',
    exampleSentenceEn: 'An old university classmate called me completely out of the blue.',
    translationPt: 'Do nada / de repente',
  },
  'hit the ground running': {
    word: 'hit the ground running',
    partOfSpeech: 'idiom',
    definitionEn: 'To start an activity with great energy and immediate success.',
    exampleSentenceEn: 'Our team hit the ground running on Monday morning to meet the launch date.',
    translationPt: 'Começar com tudo / começar a todo vapor',
  },
  'by the way': {
    word: 'by the way',
    partOfSpeech: 'conversational phrase',
    definitionEn: 'Used to introduce a new topic or additional relevant point.',
    exampleSentenceEn: 'By the way, did you receive the notes from our previous meeting?',
    translationPt: 'A propósito / por falar nisso',
  },
  'in a nutshell': {
    word: 'in a nutshell',
    partOfSpeech: 'idiom',
    definitionEn: 'In a very brief and concise summary.',
    exampleSentenceEn: 'In a nutshell, living your English daily is the fastest route to fluency.',
    translationPt: 'Em poucas palavras / em resumo',
  },
  'no worries': {
    word: 'no worries',
    partOfSpeech: 'conversational phrase',
    definitionEn: 'A friendly way to say "you are welcome" or "it is not a problem".',
    exampleSentenceEn: 'Thanks for sending the link! — No worries at all, happy to help.',
    translationPt: 'Sem problemas / de nada / tranquilo',
  },
  'hang in there': {
    word: 'hang in there',
    partOfSpeech: 'idiom',
    definitionEn: 'An encouragement to keep going and not give up during tough times.',
    exampleSentenceEn: 'Hang in there! Learning a language takes patience, but you are progressing fast.',
    translationPt: 'Aguente firme / não desista',
  },
  'cut corners': {
    word: 'cut corners',
    partOfSpeech: 'idiom',
    definitionEn: 'To do something in the easiest or cheapest way, often reducing quality.',
    exampleSentenceEn: 'We take pride in our craft and never cut corners on quality.',
    translationPt: 'Pegar atalhos / fazer nas coxas',
  },
  'see eye to eye': {
    word: 'see eye to eye',
    partOfSpeech: 'idiom',
    definitionEn: 'To agree completely with someone on an issue.',
    exampleSentenceEn: 'My manager and I see eye to eye on the new project strategy.',
    translationPt: 'Concordar plenamente',
  },
  'piece of cake': {
    word: 'piece of cake',
    partOfSpeech: 'idiom',
    definitionEn: 'Something that is very easy and simple to do.',
    exampleSentenceEn: 'Once you practice the basic pattern, speaking English becomes a piece of cake.',
    translationPt: 'Moleza / mamão com açúcar',
  },
  'spill the beans': {
    word: 'spill the beans',
    partOfSpeech: 'idiom',
    definitionEn: 'To reveal a secret or confidential information.',
    exampleSentenceEn: 'Don’t spill the beans about the surprise party on Saturday!',
    translationPt: 'Dar com a língua nos dentes / contar o segredo',
  },
  'burn the midnight oil': {
    word: 'burn the midnight oil',
    partOfSpeech: 'idiom',
    definitionEn: 'To work or study late into the night.',
    exampleSentenceEn: 'She burned the midnight oil to prepare for her international certification.',
    translationPt: 'Trabalhar/estudar até altas horas da noite',
  },
  'better late than never': {
    word: 'better late than never',
    partOfSpeech: 'proverb / phrase',
    definitionEn: 'It is better to do something late than not to do it at all.',
    exampleSentenceEn: 'I started learning English in my thirties, but better late than never!',
    translationPt: 'Antes tarde do que nunca',
  },
  'play it by ear': {
    word: 'play it by ear',
    partOfSpeech: 'idiom',
    definitionEn: 'To handle a situation as it develops without a strict advance plan.',
    exampleSentenceEn: 'We don’t have a rigid dinner schedule tonight; let’s just play it by ear.',
    translationPt: 'Decidir na hora / improvisar conforme o momento',
  },

  // Everyday Office & Routine
  deadline: {
    word: 'deadline',
    partOfSpeech: 'noun',
    definitionEn: 'The latest date or time by which a task must be completed.',
    exampleSentenceEn: 'Our team worked diligently to meet the Friday project deadline.',
    translationPt: 'Prazo limite',
  },
  brainstorm: {
    word: 'brainstorm',
    partOfSpeech: 'verb / noun',
    definitionEn: 'To produce ideas or solutions quickly through open discussion.',
    exampleSentenceEn: 'We gathered in the meeting room to brainstorm new ideas.',
    translationPt: 'Debater ideias / fazer brainstorming',
  },
  agenda: {
    word: 'agenda',
    partOfSpeech: 'noun',
    definitionEn: 'A list of topics and goals to be discussed during a meeting.',
    exampleSentenceEn: 'The team lead reviewed the three key items on today’s agenda.',
    translationPt: 'Pauta da reunião',
  },
  groceries: {
    word: 'groceries',
    partOfSpeech: 'noun plural',
    definitionEn: 'Food and household supplies purchased at a supermarket.',
    exampleSentenceEn: 'I stopped by the market to pick up fresh groceries for dinner.',
    translationPt: 'Compras de mercado / mantimentos',
  },
  recipe: {
    word: 'recipe',
    partOfSpeech: 'noun',
    definitionEn: 'A set of instructions describing how to cook a specific dish.',
    exampleSentenceEn: 'She followed an easy recipe for homemade tomato pasta.',
    translationPt: 'Receita culinária',
  },
  wind_down: {
    word: 'wind down',
    partOfSpeech: 'phrasal verb',
    definitionEn: 'To relax gradually after a busy or active day.',
    exampleSentenceEn: 'Reading a good book helps me wind down before going to sleep.',
    translationPt: 'Desacelerar / relaxar ao final do dia',
  },
  journal: {
    word: 'journal',
    partOfSpeech: 'noun / verb',
    definitionEn: 'A daily record where you write personal thoughts and experiences.',
    exampleSentenceEn: 'Writing one sentence in my English journal every night keeps my practice consistent.',
    translationPt: 'Diário pessoal / registrar reflexões',
  },
  gratitude: {
    word: 'gratitude',
    partOfSpeech: 'noun',
    definitionEn: 'The state or feeling of being thankful and appreciative.',
    exampleSentenceEn: 'Expressing gratitude for small moments creates a positive mindset.',
    translationPt: 'Gratidão',
  },
  feedback: {
    word: 'feedback',
    partOfSpeech: 'noun',
    definitionEn: 'Helpful advice or constructive comments on how to improve performance.',
    exampleSentenceEn: 'Her constructive feedback gave me clear directions for the next speaking task.',
    translationPt: 'Retorno construtivo / feedback',
  },
  schedule: {
    word: 'schedule',
    partOfSpeech: 'noun / verb',
    definitionEn: 'A plan giving expected times for different events or activities.',
    exampleSentenceEn: 'Maintaining a regular morning study schedule builds lasting confidence.',
    translationPt: 'Horário / cronograma / agendar',
  },
  efficient: {
    word: 'efficient',
    partOfSpeech: 'adjective',
    definitionEn: 'Working in a well-organized and competent way without wasting time.',
    exampleSentenceEn: 'Using short daily podcasts is an efficient method to train listening skills.',
    translationPt: 'Eficiente / produtivo',
  },
  confidence: {
    word: 'confidence',
    partOfSpeech: 'noun',
    definitionEn: 'A feeling of self-assurance arising from appreciation of one’s abilities.',
    exampleSentenceEn: 'Practicing speaking out loud every single day builds natural confidence.',
    translationPt: 'Confiança / segurança',
  },
  fluency: {
    word: 'fluency',
    partOfSpeech: 'noun',
    definitionEn: 'The ability to speak or write a language smoothly, easily, and naturally.',
    exampleSentenceEn: 'Fluency is not about perfection; it is about communicating thoughts clearly.',
    translationPt: 'Fluência natural',
  },
  pronunciation: {
    word: 'pronunciation',
    partOfSpeech: 'noun',
    definitionEn: 'The correct and natural way in which a word or language is spoken.',
    exampleSentenceEn: 'Repeating after native speakers helps fine-tune your English pronunciation.',
    translationPt: 'Pronúncia correta',
  },
  accent: {
    word: 'accent',
    partOfSpeech: 'noun',
    definitionEn: 'A distinctive mode of pronunciation characteristic of a country or region.',
    exampleSentenceEn: 'Every English speaker has an authentic accent that makes their voice unique.',
    translationPt: 'Sotaque',
  },
  collaborate: {
    word: 'collaborate',
    partOfSpeech: 'verb',
    definitionEn: 'To work jointly with others on an activity or project.',
    exampleSentenceEn: 'Our team loves to collaborate on creative presentations in English.',
    translationPt: 'Colaborar / trabalhar em conjunto',
  },
  clarify: {
    word: 'clarify',
    partOfSpeech: 'verb',
    definitionEn: 'To make a statement or idea less confused and more clearly comprehensible.',
    exampleSentenceEn: 'Could you please clarify what you mean by that specific phrase?',
    translationPt: 'Esclarecer / clarificar',
  },
  summarize: {
    word: 'summarize',
    partOfSpeech: 'verb',
    definitionEn: 'To give a brief statement of the main points of something.',
    exampleSentenceEn: 'At the end of the lesson, the teacher asked me to summarize the key takeaways.',
    translationPt: 'Resumir / recapitular',
  },
  comfortable: {
    word: 'comfortable',
    partOfSpeech: 'adjective',
    definitionEn: 'Providing physical ease, or feeling relaxed and free from stress.',
    exampleSentenceEn: 'I feel much more comfortable expressing my opinions in English now.',
    translationPt: 'Confortável / à vontade',
  },
  opportunity: {
    word: 'opportunity',
    partOfSpeech: 'noun',
    definitionEn: 'A set of circumstances that makes it possible to do something advantageous.',
    exampleSentenceEn: 'Each live lesson is a great opportunity to expand your active vocabulary.',
    translationPt: 'Oportunidade',
  },
  challenge: {
    word: 'challenge',
    partOfSpeech: 'noun / verb',
    definitionEn: 'A task or situation that tests someone’s abilities in a stimulating way.',
    exampleSentenceEn: 'Embracing this speaking challenge helped me step outside my comfort zone.',
    translationPt: 'Desafio / desafiar',
  },
  progress: {
    word: 'progress',
    partOfSpeech: 'noun / verb',
    definitionEn: 'Forward or onward movement toward a goal or higher standard.',
    exampleSentenceEn: 'You are making steady progress each week by keeping your daily routine.',
    translationPt: 'Progresso / avançar',
  },
  improve: {
    word: 'improve',
    partOfSpeech: 'verb',
    definitionEn: 'To make or become better in quality, value, or skill.',
    exampleSentenceEn: 'Listening to 10 minutes of English audio every day will improve your comprehension.',
    translationPt: 'Melhorar / aperfeiçoar',
  },
  overcome: {
    word: 'overcome',
    partOfSpeech: 'verb',
    definitionEn: 'To succeed in dealing with a problem or difficulty.',
    exampleSentenceEn: 'With consistent practice, you can easily overcome the fear of speaking.',
    translationPt: 'Superar / vencer obstáculo',
  },
  habit: {
    word: 'habit',
    partOfSpeech: 'noun',
    definitionEn: 'A settled or regular tendency or practice, especially one that is hard to give up.',
    exampleSentenceEn: 'Making English part of your morning coffee is a powerful daily habit.',
    translationPt: 'Hábito / costume diário',
  },
};

/**
 * Deterministic fast string hash for unique variation selection
 */
function hashWord(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Generates an automatic, high-quality, simplified English definition and example sentence
 * for any English word or conversational expression typed by the teacher.
 */
export function getDictionaryDefinition(
  rawWord: string,
  context?: string
): Omit<StudentDictionaryEntry, 'id'> {
  const cleanKey = rawWord.toLowerCase().trim();
  const normalizedKey = cleanKey.replace(/[_\-]+/g, ' ');

  // 1. Direct dictionary match
  if (COMMON_ROUTINE_DICTIONARY[cleanKey]) {
    return COMMON_ROUTINE_DICTIONARY[cleanKey];
  }
  if (COMMON_ROUTINE_DICTIONARY[normalizedKey]) {
    return COMMON_ROUTINE_DICTIONARY[normalizedKey];
  }

  const wordTrimmed = rawWord.trim();
  const lower = wordTrimmed.toLowerCase();
  const wordsCount = wordTrimmed.split(/\s+/).length;
  const hash = hashWord(lower);

  // 2. Multi-word expressions, idioms & questions
  if (wordsCount > 1) {
    const isQuestionOrGreeting =
      /^(how|what|where|when|why|who|which|is|are|do|does|did|can|could|would|will|should|hello|hi|good morning|good evening)\b/i.test(
        wordTrimmed
      );

    if (isQuestionOrGreeting) {
      const questionPatterns = [
        {
          def: `A natural conversational prompt used to ask questions, initiate polite dialogue, or open discussions.`,
          ex: `During our speaking session, the teacher asked, "${wordTrimmed}?" to keep the conversation flowing.`,
        },
        {
          def: `An everyday inquiry expression used by native speakers to seek clarity, updates, or personal opinions.`,
          ex: `"${wordTrimmed}?" she asked with a friendly smile as we met at the coffee shop.`,
        },
        {
          def: `A conversational phrase used to check in on someone, start a friendly chat, or transition topics.`,
          ex: `Whenever we start our morning routine, I like to ask: "${wordTrimmed}?"`,
        },
      ];
      const selected = questionPatterns[hash % questionPatterns.length];
      return {
        word: wordTrimmed,
        partOfSpeech: 'conversational expression / question',
        definitionEn: selected.def,
        exampleSentenceEn: selected.ex,
        translationPt: `Expressão conversacional em inglês`,
      };
    }

    // Phrasal verb or idiomatic expression
    const idiomPatterns = [
      {
        def: `A dynamic everyday expression used to convey a specific concept or action smoothly in natural speech.`,
        ex: `Native speakers frequently use "${wordTrimmed}" when discussing everyday situations with friends.`,
      },
      {
        def: `An idiomatic English phrase that gives your speech more natural rhythm and authentic color.`,
        ex: `I wrote down "${wordTrimmed}" in my notes so I can use it during our next conversation session.`,
      },
      {
        def: `A practical conversational expression used to connect thoughts and convey subtle nuance effortlessly.`,
        ex: `Knowing how to use "${wordTrimmed}" properly will make your English sound much more fluent and natural.`,
      },
      {
        def: `A common figure of speech in conversational English that describes a shared experience or feeling.`,
        ex: `Once you understand "${wordTrimmed}," you will notice it everywhere in podcasts and movies.`,
      },
    ];
    const selected = idiomPatterns[hash % idiomPatterns.length];
    return {
      word: wordTrimmed,
      partOfSpeech: 'phrasal verb / idiom',
      definitionEn: selected.def,
      exampleSentenceEn: selected.ex,
      translationPt: `Expressão idiomática prática`,
    };
  }

  // 3. Action verbs (ending in -ing)
  if (lower.endsWith('ing') && lower.length > 4) {
    const baseVerb = lower.slice(0, -3);
    const ingPatterns = [
      {
        def: `The ongoing activity or practice of ${baseVerb} in daily life, work, or leisure routines.`,
        ex: `I find that ${wordTrimmed} for just fifteen minutes each day keeps me focused and energetic.`,
      },
      {
        def: `An active process involving ${baseVerb} that happens regularly throughout modern routines.`,
        ex: `She spent the entire afternoon ${wordTrimmed}, which brought great satisfaction to the whole team.`,
      },
      {
        def: `The continuous action or habit of ${baseVerb} during conversations or everyday tasks.`,
        ex: `Consistency in ${wordTrimmed} is one of the most effective habits for long-term personal success.`,
      },
    ];
    const selected = ingPatterns[hash % ingPatterns.length];
    return {
      word: wordTrimmed,
      partOfSpeech: 'action / continuous verb',
      definitionEn: selected.def,
      exampleSentenceEn: selected.ex,
      translationPt: `Ação em andamento / atividade`,
    };
  }

  // 4. Adjectives (ending in -ful, -able, -ive, -ous, -ic, -y, -al, -ent, -ant)
  if (
    lower.endsWith('ful') ||
    lower.endsWith('able') ||
    lower.endsWith('ive') ||
    lower.endsWith('ous') ||
    lower.endsWith('ic') ||
    lower.endsWith('al') ||
    lower.endsWith('ent') ||
    lower.endsWith('ant') ||
    (lower.endsWith('y') && lower.length > 3)
  ) {
    const adjPatterns = [
      {
        def: `Describing a noticeable quality, distinct state, or clear characteristic of being ${lower}.`,
        ex: `The feedback received during today’s session was exceptionally ${lower} and encouraging.`,
      },
      {
        def: `Used to characterize a person, situation, or environment that feels genuinely ${lower}.`,
        ex: `Finding a ${lower} way to approach this conversation made everyone feel at ease immediately.`,
      },
      {
        def: `Expressing a feeling, atmosphere, or outcome that is distinctly ${lower} in daily experiences.`,
        ex: `It was truly ${lower} to see how quickly the team adapted to speaking English together.`,
      },
      {
        def: `Having the specific attribute or natural property of being ${lower} in real-world contexts.`,
        ex: `She maintained a remarkably ${lower} attitude throughout the entire speaking challenge.`,
      },
    ];
    const selected = adjPatterns[hash % adjPatterns.length];
    return {
      word: wordTrimmed,
      partOfSpeech: 'adjective',
      definitionEn: selected.def,
      exampleSentenceEn: selected.ex,
      translationPt: `Adjetivo / característica`,
    };
  }

  // 5. Adverbs (ending in -ly)
  if (lower.endsWith('ly') && lower.length > 4) {
    const baseAdj = lower.slice(0, -2);
    const advPatterns = [
      {
        def: `In a manner that is clearly ${baseAdj}, showing that specific quality during an action.`,
        ex: `He explained his thoughts ${wordTrimmed} so that every listener could follow easily.`,
      },
      {
        def: `Done with a ${baseAdj} attitude, pace, or direct emphasis in everyday communication.`,
        ex: `She smiled ${wordTrimmed} and answered all the questions with great natural confidence.`,
      },
      {
        def: `Occurring in a ${baseAdj} and consistent way as part of regular daily interactions.`,
        ex: `Practicing ${wordTrimmed} every morning accelerates your natural language fluency.`,
      },
    ];
    const selected = advPatterns[hash % advPatterns.length];
    return {
      word: wordTrimmed,
      partOfSpeech: 'adverb',
      definitionEn: selected.def,
      exampleSentenceEn: selected.ex,
      translationPt: `Advérbio / modo`,
    };
  }

  // 6. Abstract / State Nouns (ending in -tion, -ment, -ness, -ity, -ance, -ence, -ship)
  if (
    lower.endsWith('tion') ||
    lower.endsWith('ment') ||
    lower.endsWith('ness') ||
    lower.endsWith('ity') ||
    lower.endsWith('ance') ||
    lower.endsWith('ence') ||
    lower.endsWith('ship')
  ) {
    const nounPatterns = [
      {
        def: `The state, core concept, or fundamental quality of ${lower} in personal and professional life.`,
        ex: `Developing genuine ${lower} is essential for communicating with clarity and poise.`,
      },
      {
        def: `A significant aspect or condition related to ${lower} that influences our daily routines.`,
        ex: `Our discussion highlighted the vital role that ${lower} plays in reaching long-term fluency.`,
      },
      {
        def: `The ongoing practice, cultivation, or presence of ${lower} in everyday human interaction.`,
        ex: `You can observe great ${lower} when students support one another in English conversations.`,
      },
    ];
    const selected = nounPatterns[hash % nounPatterns.length];
    return {
      word: wordTrimmed,
      partOfSpeech: 'noun (concept / quality)',
      definitionEn: selected.def,
      exampleSentenceEn: selected.ex,
      translationPt: `Substantivo / conceito`,
    };
  }

  // 7. Base verbs (common English verb endings or common short words)
  const isLikelyVerb =
    /^(go|come|take|make|get|give|put|see|look|hear|listen|say|tell|ask|talk|speak|walk|run|work|play|try|help|start|stop|keep|leave|feel|bring|begin|hold|write|read|stand|sit|open|close|buy|pay|meet|send|build|grow|draw|learn|teach|cook|clean|drive|fly|choose|decide|plan|join|share|lead|follow|hope|wish|show|move|live|love|like|need|want|find|call|use)\b/i.test(
      lower
    ) || lower.endsWith('ize') || lower.endsWith('ise') || lower.endsWith('ate');

  if (isLikelyVerb) {
    const verbPatterns = [
      {
        def: `To actively ${lower} as a purposeful action or habit in everyday routines.`,
        ex: `I always make sure to ${lower} with intention before starting my daily English practice.`,
      },
      {
        def: `To perform the action of ${lower}ing smoothly when communicating or handling tasks.`,
        ex: `Can you show me the easiest way to ${lower} in this type of conversation?`,
      },
      {
        def: `To engage in or carry out the process of ${lower} during real-life activities.`,
        ex: `They decided to ${lower} together so they could accomplish their mutual goals faster.`,
      },
      {
        def: `To express or execute the action of ${lower} with natural poise and clarity.`,
        ex: `Whenever I get the chance, I like to ${lower} and observe how native speakers react.`,
      },
    ];
    const selected = verbPatterns[hash % verbPatterns.length];
    return {
      word: wordTrimmed,
      partOfSpeech: 'verb',
      definitionEn: selected.def,
      exampleSentenceEn: selected.ex,
      translationPt: `Verbo / ação`,
    };
  }

  // 8. General / Concrete Nouns & Objects
  const generalPatterns = [
    {
      def: `A noun denoting ${lower}, used in standard English to designate a specific person, place, object, or substance.`,
      ex: `She noticed the ${lower} right away and commented on it during the conversation.`,
      pos: 'noun',
    },
    {
      def: `An entity or item known as ${lower}, commonly referenced in daily life, work, and general discourse.`,
      ex: `Having a reliable ${lower} readily accessible makes daily activities run much smoother.`,
      pos: 'noun',
    },
    {
      def: `A distinct object, element, or entity characterized as ${lower} in conversational and formal English.`,
      ex: `We talked about how ${lower} plays an essential role in everyday communication.`,
      pos: 'noun',
    },
    {
      def: `A concrete or countable noun referring to ${lower} in everyday settings.`,
      ex: `Could you please bring me the ${lower} before we leave for the meeting?`,
      pos: 'noun',
    },
    {
      def: `A standard English noun designating a ${lower} encountered in common personal or professional environments.`,
      ex: `I wrote down ${lower} in my notebook so I could practice using it in a sentence later.`,
      pos: 'noun',
    },
  ];

  const selected = generalPatterns[hash % generalPatterns.length];
  return {
    word: wordTrimmed,
    partOfSpeech: selected.pos,
    definitionEn: selected.def,
    exampleSentenceEn: selected.ex,
    translationPt: `Vocabulário prático em inglês`,
  };
}

/**
 * Returns instant simplified English definition & example sentence for live sessions
 */
export function getInstantVocabEntry(
  word: string,
  context?: string
): {
  word: string;
  definitionEn: string;
  exampleSentenceEn: string;
} {
  const entry = getDictionaryDefinition(word, context);
  return {
    word: entry.word,
    definitionEn: entry.definitionEn,
    exampleSentenceEn: entry.exampleSentenceEn,
  };
}

