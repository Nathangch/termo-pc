
// Dados para o modo TERMO (Fallback)
const WORDS_DATA = ['TERMO', 'SENHA', 'NOBRE', 'VAZIO', 'IDEIA', 'HONRA', 'JUSTO', 'MORAL', 'ETICA', 'PODER', 'AMIGO', 'SAGAZ', 'ANEXO', 'GLEBA', 'HEROI', 'SUTIL', 'FALSO', 'BANDO', 'QUASE', 'LOGRO', 'DENS', 'VIGOR', 'TEMPO', 'MUNDO', 'LIVRO', 'COISA', 'GRUPO', 'LINHA', 'FORMA', 'PARTE', 'CORPO', 'NIVEL', 'LOCAL', 'MAIOR', 'MENOR', 'GERAL', 'TOTAL', 'IGUAL', 'CERTO', 'FIM', 'MEIO', 'AGORA', 'HOJE', 'NOITE', 'FATO', 'CASO', 'LADO', 'AREA', 'PAIS'];

// Dados semânticos para o modo PALAVRAS CRUZADAS
const CROSSWORD_DATA = [
    { word: 'TERRA', clue: 'Planeta onde vivemos' },
    { word: 'AGUIA', clue: 'Ave de rapina conhecida por sua visão' },
    { word: 'CINCO', clue: 'Número de dedos em uma mão' },
    { word: 'LIVRO', clue: 'Objeto de leitura com páginas' },
    { word: 'NOITE', clue: 'Período escuro do dia' },
    { word: 'CARRO', clue: 'Veículo automotor de quatro rodas' },
    { word: 'PEIXE', clue: 'Animal que vive na água e respira por brânquias' },
    { word: 'CASAS', clue: 'Construções onde pessoas moram (plural)' },
    { word: 'TEMPO', clue: 'O que o relógio marca' },
    { word: 'AMIGO', clue: 'Pessoa com quem se tem amizade' },
    { word: 'FALTA', clue: 'Ausência de algo ou alguém' },
    { word: 'FLORA', clue: 'Conjunto de plantas de uma região' },
    { word: 'PORTA', clue: 'Abertura para entrar ou sair de um cômodo' },
    { word: 'MESA', clue: 'Móvel com tampo e pernas' },
    { word: 'CARTA', clue: 'Correspondência enviada pelo correio' },
    { word: 'CHAVE', clue: 'Objeto usado para abrir fechaduras' },
    { word: 'NAVIO', clue: 'Grande embarcação que navega no mar' },
    { word: 'PAPEL', clue: 'Material feito de celulose para escrever' },
    { word: 'DENTE', clue: 'Estrutura óssea na boca usada para mastigar' },
    { word: 'LEITE', clue: 'Líquido branco produzido por mamíferos' },
    { word: 'FOGO', clue: 'Produz luz e calor na combustão' },
    { word: 'VENTO', clue: 'Ar em movimento' },
    { word: 'AREIA', clue: 'Grãos de rocha encontrados na praia' },
    { word: 'SOLAR', clue: 'Relativo ao Sol ou casa senhorial' },
    { word: 'LUNAR', clue: 'Relativo à Lua' },
    { word: 'CALOR', clue: 'Sensação térmica oposta ao frio' },
    { word: 'FRIO', clue: 'Baixa temperatura' },
    { word: 'NUVEM', clue: 'Massa de vapor de água no céu' },
    { word: 'CHUVA', clue: 'Água que cai do céu' },
    { word: 'PRAIA', clue: 'Faixa de areia à beira-mar' },
    { word: 'CAMPO', clue: 'Área rural ou terreno esportivo' },
    { word: 'FONTE', clue: 'Origem de água ou de informação' },
    { word: 'PONTE', clue: 'Estrutura que liga duas margens' },
    { word: 'RUA', clue: 'Via pública para circulação' },
    { word: 'VIDRO', clue: 'Material transparente e frágil' },
    { word: 'TELHA', clue: 'Peça usada para cobrir telhados' },
    { word: 'MURO', clue: 'Parede que cerca um terreno' },
    { word: 'COPO', clue: 'Recipiente para beber líquidos' },
    { word: 'FACA', clue: 'Utensílio cortante de mesa' },
    { word: 'RADIO', clue: 'Aparelho que transmite som' },
    { word: 'PIANO', clue: 'Instrumento musical de teclas e cordas' },
    { word: 'VIOLA', clue: 'Instrumento de cordas parecido com o violão' },
    { word: 'HARPA', clue: 'Instrumento musical com muitas cordas verticais' },
    { word: 'FLUTA', clue: 'Instrumento de sopro' },
    { word: 'ATOR', clue: 'Profissional que interpreta personagens' },
    { word: 'ARTE', clue: 'Expressão criativa humana' },
    { word: 'COR', clue: 'Percepção visual da luz (vermelho, azul...)' },
    { word: 'LUZ', clue: 'Claridade que permite ver' },
    { word: 'SOM', clue: 'O que se ouve' },
    { word: 'PAZ', clue: 'Ausência de guerra ou conflito' },
    { word: 'AMOR', clue: 'Sentimento de grande afeto' },
    { word: 'RISOS', clue: 'Expressões de alegria (plural)' },
    { word: 'FESTA', clue: 'Celebração com música e alegra' }
];

if (typeof window !== 'undefined') {
    window.WORDS_DATA = WORDS_DATA;
    window.CROSSWORD_DATA = CROSSWORD_DATA;
}
