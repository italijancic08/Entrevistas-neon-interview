export type InterviewerId = 1 | 2 | 3;

export interface Question {
  id: number;
  text: string;
  answers: Record<InterviewerId, string>;
}

export const INTERVIEWERS: InterviewerId[] = [1, 2, 3];

export const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "¿Qué piensas que es la programación?",
    answers: {
      1: "Para mí la programación es una manera de dar instrucciones a una computadora para que ejecute tareas o resuelva problemas.",
      2: "Para mí, la programación es darle instrucciones a una computadora para que pueda realizar determinadas tareas o resolver problemas mediante un código.",
      3: "Son programas que te ayudan a la vida y simplifican cosas en la parte de computación",
    },
  },
  {
    id: 2,
    text: "¿Cómo piensas que se desarrolla una aplicación?",
    answers: {
      1: "Para mí para hacer una aplicación primero se tiene que definir una necesidad o un objetivo y después se la diseña mediante código.",
      2: "Primero se piensa qué función va a cumplir y qué problema va a solucionar. Después se diseña y se programa, se hacen pruebas para encontrar errores y finalmente se corrige y se mejora hasta que funciona correctamente.",
      3: "Programando, primero se crea un proyecto y se piensa que se quiere hacer y que utilidad se le va a dar, después se programa",
    },
  },
  {
    id: 3,
    text: "¿Consideras útil el trabajo del programador?",
    answers: {
      1: "Lo considero útil porque al desarrollar aplicaciones o paginas o lo que sea, resuelve las necesidades que hay actualmente.",
      2: "Sí, porque actualmente la tecnología está presente en casi todo y los programadores son los que crean y mantienen muchos de los sistemas y aplicaciones que utilizamos.",
      3: "Re útil, porque es uno de los más importantes en la computación, son los que crean cosas, aplicaciones, programas para diferentes actividades y diferentes fines",
    },
  },
  {
    id: 4,
    text: "¿Piensas que cualquier persona puede programar?",
    answers: {
      1: "Para mí cualquier persona puede programar si estudia y práctica, se puede.",
      2: "Sí. Creo que cualquier persona puede aprender a programar si tiene interés, paciencia y práctica. Obviamente, algunas personas pueden tener más facilidad que otras, pero es algo que se puede aprender.",
      3: "No, se debe de estudiar, hay algunos que son mejores que otros y la práctica lleva a ser mejor",
    },
  },
  {
    id: 5,
    text: "¿Crees que el programador puede ser reemplazado por IA?",
    answers: {
      1: "Para mi la IA es útil sí, pero no creo que lo pueda llegar a reemplazar porque actualmente todavía es inestable y necesita ser supervisada.",
      2: "Creo que la IA puede reemplazar algunas tareas que realiza un programador y hacerlas mucho más rápido, pero no creo que pueda reemplazar completamente al programador. Sigue siendo necesaria una persona que sepa analizar el problema, tomar decisiones y controlar lo que hace la IA.",
      3: "No, el programador creo la inteligencia artificial",
    },
  },
  {
    id: 6,
    text: "¿Dónde crees que trabaja un programador?",
    answers: {
      1: "Creo yo que puede trabajar en empresas de software, también empresas de hardware, empresas de desarrollo de videojuegos, desarrollador independiente, etc.",
      2: "Puede trabajar en empresas de tecnología, bancos, industrias, empresas de videojuegos, desarrollando aplicaciones o páginas web, de manera independiente o incluso trabajando de forma remota desde su casa.",
      3: "En una computadora, desde su casa",
    },
  },
  {
    id: 7,
    text: "¿Cuánto tiempo crees que se tarda en desarrollar un sistema?",
    answers: {
      1: "Y creo que varia mucho depende del proyecto puede tardar semanas como puede tardar años.",
      2: "Depende mucho del sistema. Uno sencillo puede tardar días o semanas, mientras que un sistema más grande y complejo puede tardar meses o incluso años y necesitar varias personas trabajando en conjunto.",
      3: "Depende de que se quiere lograr, algunos son más cortos otros más largos",
    },
  },
  {
    id: 8,
    text: "Una vez que el programador recibe su título ¿Crees que deja de estudiar?",
    answers: {
      1: "No no, no puede dejar de estudiar, la tecnología avanza y se necesita estar constantemente actualizado",
      2: "No. Creo que en programación es necesario seguir estudiando y aprendiendo porque la tecnología cambia constantemente, aparecen nuevos lenguajes, herramientas y formas de trabajar. Recibirse sería más bien tener una base para seguir aprendiendo.",
      3: "No, porque siempre salen cosas nuevas relacionada a la tecnología",
    },
  },
];

export const CONCLUSION_TITLE = ["¿QUÉ PIENSA LA SOCIEDAD", "SOBRE LA PROGRAMACIÓN?"];

export const CONCLUSION: string[] = [
  "Analizando las entrevistas, vemos que las personas tienen una idea bastante acertada de la programación y del trabajo del programador. Los tres entrevistados coincidieron en que programar es darle instrucciones a una computadora para resolver problemas, en que el programador es útil porque la tecnología está en casi todo, y en que nunca deja de estudiar porque todo cambia constantemente.",
  "También coincidieron en que ningún programador puede ser reemplazado por completo por la IA, aunque con argumentos distintos.",
  "Hubo diferencias en si cualquier persona puede programar y en la profundidad de las respuestas: quienes tienen más cercanía con la tecnología explicaron mejor el proceso de desarrollo, y el otro dio una visión más general.",
  "En nuestra opinión, los resultados muestran que la sociedad valora la profesión, pero todavía con una imagen básica de lo que es.",
  "Nos pareció interesante la propuesta de la actividad, por qué podemos ver un poco cual es la imagen de un programador vista desde un lado exterior a la tecnología. También vimos que se reconoce la importancia del programador a pesar de no ser una carrera tan nombrada.",
];

export const INSTITUTION = {
  university: "Universidad Tecnológica Nacional",
  faculty: "Facultad Regional Reconquista",
  subject: "Gestión de Desarrollo de Software",
  place: "Reconquista, 2026",
  members: ["Valentino Rivas", "Gabriel Oviedo", "Bruno Virili"],
};