import { Question } from "../services/geminiService";

export const STATIC_QUIZZES: Record<string, Record<string, Question[]>> = {
  en: {
    "Joshua 1:1-18": [
      { 
        id: 1, 
        text: "What was the primary command given to Yehoshua after the death of Moshe?", 
        options: ["To build a temple in the desert", "To cross the Jordan and take possession of the land", "To return to Egypt and free more people", "To write a new set of laws for the people"], 
        correctAnswer: 1,
        explanation: "After Moshe's death, God explicitly commands Yehoshua to lead the people across the Jordan River to enter the land promised to their ancestors."
      },
      { 
        id: 2, 
        text: "According to the Steinsaltz commentary, what does the phrase 'Be strong and courageous' imply for Yehoshua's leadership?", 
        options: ["Physical strength only", "The need for spiritual and psychological fortitude to lead the nation", "That he should never listen to anyone else", "That he must be a fierce warrior in every battle"], 
        correctAnswer: 1,
        explanation: "Steinsaltz notes that this command refers to the inner strength required to face the immense responsibility of leading a nation into a new land."
      },
      { 
        id: 3, 
        text: "What condition was set for Yehoshua's success in all his endeavors?", 
        options: ["Winning every physical battle", "Collecting gold from the conquered nations", "Meditating on the Book of the Law (Torah) day and night", "Building a large army"], 
        correctAnswer: 2,
        explanation: "The text emphasizes that success is tied to constant study and adherence to the Torah, which provides the spiritual foundation for leadership."
      },
      { 
        id: 4, 
        text: "How did the tribes of Reuben, Gad, and the half-tribe of Manasseh respond to Yehoshua's instructions?", 
        options: ["They refused to cross the Jordan", "They demanded more land before fighting", "They pledged total loyalty and promised to fight alongside their brothers", "They asked to return to Egypt"], 
        correctAnswer: 2,
        explanation: "These tribes, who settled east of the Jordan, reaffirmed their commitment to help the rest of Israel conquer the land before returning to their own territory."
      }
    ],
    "Joshua 2:1-24": [
      { id: 1, text: "Where did the two spies sent by Yehoshua stay in Yericho?", options: ["In the king's palace", "In the house of Rahab", "In a cave outside the city", "In the city market"], correctAnswer: 1 },
      { id: 2, text: "What did Rahab confess to the spies about the Bnei Israel?", options: ["They were ready to fight to the death", "They had never heard of the Bnei Israel", "Their hearts had melted with fear because of what God did for Israel", "They wanted to make a peace treaty"], correctAnswer: 2 },
      { id: 3, text: "What sign was Rahab told to place in her window to ensure her family's safety?", options: ["A white flag", "A scarlet cord", "A blue ribbon", "A golden shield"], correctAnswer: 1 },
      { id: 4, text: "According to the commentary, why is Rahab's recognition of God significant?", options: ["Because she was a local leader", "It shows that even among the Canaanites, the power of God was being recognized", "Because she was a relative of Yehoshua", "It was required by the spies"], correctAnswer: 1 }
    ],
    "Joshua 3:1-17": [
      { id: 1, text: "What was the role of the Kohanim when crossing the Jordan?", options: ["To lead the army", "To carry the Aron HaBrit into the water", "To stay behind and pray", "To build a bridge"], correctAnswer: 1 },
      { id: 2, text: "What happened to the waters of the Jordan when the Kohanim's feet touched them?", options: ["They turned to blood", "They froze solid", "They stood up in a heap, allowing the people to cross on dry ground", "They became very shallow"], correctAnswer: 2 },
      { id: 3, text: "How far were the people supposed to stay behind the Aron HaBrit?", options: ["100 cubits", "500 cubits", "2,000 cubits", "1,000 cubits"], correctAnswer: 2 },
      { id: 4, text: "What was the purpose of this miracle according to the text?", options: ["To show off God's power", "To exalt Yehoshua in the eyes of all Israel", "To frighten the Canaanites", "To wash the people's feet"], correctAnswer: 1 }
    ],
    "Joshua 6:1-27": [
      { id: 1, text: "How many times did the people circle Yericho on the seventh day?", options: ["Once", "Three times", "Seven times", "Twelve times"], correctAnswer: 2 },
      { id: 2, text: "What was the signal for the people to shout and the walls to fall?", options: ["A long blast on the Shofars (rams' horns)", "A flash of light from the Aron HaBrit", "Yehoshua raising his sword", "The sun setting"], correctAnswer: 0 },
      { id: 3, text: "What was the 'herem' (ban) placed on Yericho?", options: ["Only the gold was to be taken", "Everything in the city was devoted to destruction, except Rahab and her family", "The city was to be left untouched", "The people were to be made slaves"], correctAnswer: 1 },
      { id: 4, text: "According to the commentary, what does the circling of the city symbolize?", options: ["A military siege", "A spiritual process of nullifying the city's power", "A way to tire out the guards", "A traditional dance"], correctAnswer: 1 }
    ],
    "Joshua 7:1-26": [
      { id: 1, text: "Why did Bnei Israel lose the first battle at Ai?", options: ["They were outnumbered", "Because Achan took some of the devoted things from Yericho", "Yehoshua made a tactical error", "The soldiers were tired"], correctAnswer: 1 },
      { id: 2, text: "How was Achan identified as the culprit?", options: ["By a witness", "By casting lots", "He confessed immediately", "Yehoshua had a dream"], correctAnswer: 1 },
      { id: 3, text: "What did Achan steal?", options: ["A beautiful Shinarite robe, silver, and a bar of gold", "The Aron HaBrit", "Yehoshua's sword", "Food from the market"], correctAnswer: 0 },
      { id: 4, text: "What does the commentary say about 'communal responsibility' in this chapter?", options: ["It doesn't exist", "The sin of one individual can affect the entire community's standing before God", "Only Achan's family was responsible", "The leaders are always to blame"], correctAnswer: 1 }
    ]
  },
  ru: {
    "Joshua 1:1-18": [
      { 
        id: 1, 
        text: "Какое главное повеление получил Йеошуа после смерти Моше?", 
        options: ["Построить храм в пустыне", "Перейти Иордан и овладеть землей", "Вернуться в Египет и освободить больше людей", "Написать новый свод законов"], 
        correctAnswer: 1,
        explanation: "После смерти Моше Бог прямо повелевает Йеошуа вести народ через реку Иордан, чтобы войти в землю, обещанную их отцам."
      },
      { 
        id: 2, 
        text: "Согласно комментарию Штейнзальца, что подразумевает фраза «будь тверд и мужествен» для лидерства Йеошуа?", 
        options: ["Только физическую силу", "Необходимость духовной и психологической стойкости для руководства народом", "Что он никогда не должен никого слушать", "Что он должен быть свирепым воином в каждой битве"], 
        correctAnswer: 1,
        explanation: "Штейнзальц отмечает, что это повеление относится к внутренней силе, необходимой для того, чтобы нести огромную ответственность за руководство народом в новой земле."
      },
      { 
        id: 3, 
        text: "Какое условие было поставлено для успеха Йеошуа во всех его начинаниях?", 
        options: ["Победа в каждой физической битве", "Сбор золота у завоеванных народов", "Размышление над Книгой Торы день и ночь", "Создание большой армии"], 
        correctAnswer: 2,
        explanation: "Текст подчеркивает, что успех связан с постоянным изучением Торы и следованием ей, что обеспечивает духовную основу для лидерства."
      },
      { 
        id: 4, 
        text: "Как колена Реувена, Гада и половина колена Менаше ответили на наставления Йеошуа?", 
        options: ["Они отказались переходить Иордан", "Они потребовали больше земли перед боем", "Они поклялись в полной верности и обещали сражаться вместе со своими братьями", "Они попросили вернуться в Египет"], 
        correctAnswer: 2,
        explanation: "Эти колена, поселившиеся к востоку от Иордана, подтвердили свое обязательство помочь остальному Израилю завоевать землю, прежде чем вернуться на свою территорию."
      }
    ],
    "Joshua 2:1-24": [
      { id: 1, text: "Где остановились двое соглядатаев, посланных Йеошуа в Йерихо?", options: ["В царском дворце", "В доме Раав", "В пещере за городом", "На городском рынке"], correctAnswer: 1 },
      { id: 2, text: "Что Раав признала соглядатаям о Бней Исраэль?", options: ["Они были готовы сражаться до смерти", "Они никогда не слышали о Бней Исраэль", "Их сердца растаяли от страха из-за того, что Бог сделал для Израиля", "Они хотели заключить мирный договор"], correctAnswer: 2 },
      { id: 3, text: "Какой знак Раав должна была повесить в своем окне, чтобы обеспечить безопасность своей семьи?", options: ["Белый флаг", "Червленую веревку", "Голубую ленту", "Золотой щит"], correctAnswer: 1 },
      { id: 4, text: "Согласно комментарию, почему признание Бога Раав имеет важное значение?", options: ["Потому что она была местным лидером", "Это показывает, что даже среди хананеев признавалась сила Бога", "Потому что она была родственницей Йеошуа", "Этого требовали соглядатаи"], correctAnswer: 1 }
    ],
    "Joshua 3:1-17": [
      { id: 1, text: "Какова была роль Коэнов при переходе через Иордан?", options: ["Вести армию", "Нести Арон а-Брит в воду", "Остаться сзади и молиться", "Построить мост"], correctAnswer: 1 },
      { id: 2, text: "Что случилось с водами Иордана, когда их коснулись ноги Коэнов?", options: ["Они превратились в кровь", "Они замерзли", "Они встали стеной, позволив народу перейти по суше", "Они стали очень мелкими"], correctAnswer: 2 },
      { id: 3, text: "На каком расстоянии народ должен был держаться позади Арон а-Брит?", options: ["100 локтей", "500 локтей", "2000 локтей", "1000 локтей"], correctAnswer: 2 },
      { id: 4, text: "Какова была цель этого чуда согласно тексту?", options: ["Показать силу Бога", "Возвеличить Йеошуа в глазах всего Израиля", "Напугать хананеев", "Омыть ноги народу"], correctAnswer: 1 }
    ],
    "Joshua 6:1-27": [
      { id: 1, text: "Сколько раз народ обошел Йерихо на седьмой день?", options: ["Один раз", "Три раза", "Семь раз", "Двенадцать раз"], correctAnswer: 2 },
      { id: 2, text: "Что было сигналом для народа, чтобы закричать и стены пали?", options: ["Протяжный звук Шофара", "Вспышка света от Арон а-Брит", "Йеошуа, поднявший меч", "Заход солнца"], correctAnswer: 0 },
      { id: 3, text: "Что означало заклятие (херем), наложенное на Йерихо?", options: ["Нужно было забрать только золото", "Все в городе должно было быть уничтожено, кроме Раав и ее семьи", "Город должен был остаться нетронутым", "Люди должны были стать рабами"], correctAnswer: 1 },
      { id: 4, text: "Согласно комментарию, что символизирует обход города?", options: ["Военную осаду", "Духовный процесс аннулирования силы города", "Способ утомить стражу", "Традиционный танец"], correctAnswer: 1 }
    ],
    "Joshua 7:1-26": [
      { id: 1, text: "Почему Бней Исраэль проиграли первую битву при Гае?", options: ["Их было меньше", "Потому что Ахан взял из заклятого в Йерихо", "Йеошуа допустил тактическую ошибку", "Солдаты устали"], correctAnswer: 1 },
      { id: 2, text: "Как был выявлен Ахан как виновник?", options: ["По свидетельству очевидца", "Бросанием жребия", "Он сразу признался", "Йеошуа приснился сон"], correctAnswer: 1 },
      { id: 3, text: "Что украл Ахан?", options: ["Прекрасную Шинарскую одежду, серебро и слиток золота", "Арон а-Брит", "Меч Йеошуа", "Еду на рынке"], correctAnswer: 0 },
      { id: 4, text: "Что говорит комментарий о «коллективной ответственности» в этой главе?", options: ["Ее не существует", "Грех одного человека может повлиять на положение всего сообщества перед Богом", "Только семья Ахана была ответственна", "Всегда виноваты лидеры"], correctAnswer: 1 }
    ]
  }
};

export function getStaticQuiz(ref: string, language: string): Question[] | null {
  const lang = language === "ru" ? "ru" : "en";
  return STATIC_QUIZZES[lang][ref] || null;
}
