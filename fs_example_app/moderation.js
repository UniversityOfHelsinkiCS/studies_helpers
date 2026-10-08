// Offensive note filter built on the obscenity library

const {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
  pattern,
} = require('obscenity')

const dataset = englishDataset.addPhrase(phrase =>
  phrase
    .setMetadata({ originalWord: 'spic' })
    .addPattern(pattern`|spic|`)
    .addPattern(pattern`|spics|`)
)

const matcher = new RegExpMatcher({
  ...dataset.build(),
  ...englishRecommendedTransformers,
})

const joinSeparatedLetters = text => {
  const words = text
    .toLowerCase()
    .replace(/(?<=\S)[^\p{L}\p{N}\s]+(?=\S)/gu, '')
    .split(/\s+/)
    .filter(w => w.length > 0)

  const merged = []
  let run = ''
  words.forEach(w => {
    if (w.length === 1) {
      run += w
    } else {
      if (run) merged.push(run)
      run = ''
      merged.push(w)
    }
  })
  if (run) merged.push(run)

  return merged.join(' ')
}


const FINNISH_WORDS = [
  /n+e{2,}k+e+r/,
  /^r+y+s{2,}[äaie]/,
  /^h+i+n+t{2,}/,
  /^h+i+n+t+i+[nt]$/,
  /m+u+t+a+k+u+o+n/,
  /v+i+n+o+s+i+l+m/,
  /r+ä+t{2,}i+p+ä/,
  /^k+e+h+a+r+[ie]/,
  /^v+i+t+u+/,
  /^p+a+s+k+[aoie]/,
  /^k+y+r+[pv]+[äi]/,
  /^m+u+l+k+u/,
  /^p+i+l{2,}u/,
  /^h+u+o+r+[aiu]/,
  /k+u+s+i+p+ä/,
  /^r+u+n+k{2,}[auie]/,
  /^r+u+n+k+a+t/,
  /^n+u+s{2,}[iaeö]/,
]

const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't' }

const VIOLENCE = /^(kil|murder|gas|extermin|eradicat|lynch|hang|shot|bomb|burn|slaughter|masacr|eliminat|genocid|stab|behead)(s|ed|ing|in|e|es|ate|ated)?$/
const DEATH = /^(death|die)$/
const PASSIVE_VIOLENCE = /^(die|kiled|murdered|gased|exterminated|eradicated|lynched|hanged|hung|shot|burned|burnt|slaughtered|masacred|eliminated|stabed|beheaded)$/
const GROUP = /^(jew|jews|jewish|jude|judes|juden|juif|juifs|zionist|zionists|muslim|muslims|moslem|moslems|islam|arab|arabs|black|blacks|white|whites|asian|asians|gay|gays|lesbian|lesbians|homo|homos|homosexual|homosexuals|trans|tranies|imigrant|imigrants|refuge|refuges|mexican|mexicans|gypsy|gypsies|roma|christian|christians|hindu|hindus|sikh|sikhs)$/


const FI_VERB = '(tap|murhat|kasut?|hirt|polt|ampu|amu|lahdat|teurast|tuhot|hävit)'
const VIOLENCE_FI = new RegExp(`^${FI_VERB}(a|ä|ka|kä|aka|äkä|an|än|tan|tän|ava|ävä|avat|ävät|tava|tävä|tavat|tävät|etan|etän|etava|etävä|etavat|etävät|en|n)$`)
const DEATH_FI = /^(kuolema|kuolkon)$/
const PASSIVE_VIOLENCE_FI = new RegExp(`^(${FI_VERB}(an|än|tan|tän|ava|ävä|avat|ävät|tava|tävä|tavat|tävät|etan|etän|etava|etävä|etavat|etävät)|kasun|hirten|unin|kuolkon)$`)

const INFINITIVE_FI = new RegExp(`^(${FI_VERB}(a|ä)|kuola)$`)
const MODAL = /^(pitä|pitäis|pitäisi|pitäs|pita|pitais|pitas|täty|tule|kuulu|must|should|need|needs|deserve|deserves)$/
const GROUP_FI = /^(jutalai|muslim|islamilai|arab|mahanmutaj|pakolai|mustalai|somali|venäläi|neker|transu|ulkomalai)[\p{L}]*$|^(homo|lesbo)(t|ja|jen|ile|ihin|i)?$|^rys[äi][\p{L}]*$|^musti?(at|ia)$/u

const isViolence = w => VIOLENCE.test(w) || DEATH.test(w) || VIOLENCE_FI.test(w) || DEATH_FI.test(w)
const isGroup = w => GROUP.test(w) || GROUP_FI.test(w)
const isPassiveViolence = w => PASSIVE_VIOLENCE.test(w) || PASSIVE_VIOLENCE_FI.test(w)

const FILLER = /^(al|the|those|these|every|each|of|them|some|more|a|an|to|must|should|wil|shal|need|needs|be|get|got|gona|deserve|deserves|people|folk|folks|filthy|dirty|fucking|damn|now|and|kaiki|kaikia|kaikile|ne|nuo|noi|nää|nämä|vitun|satanan|perkelen|helvetin|kirotut|pitä|pitäis|pitäisi|pitäs|pita|pitais|pitas|täty|tule|kuulu|sa|on|ja|pois|nyt|myös|kans|jo|heti|se)$/
const MAX_FILLER = 4

const toRawWords = text =>
  joinSeparatedLetters(text)
    .replace(/[013457@$]/g, c => LEET[c])
    .split(/[^\p{L}]+/u)
    .filter(w => w.length > 0)

const toWords = text => toRawWords(text).map(w => w.replace(/(.)\1+/g, '$1'))

const nextContentWord = (words, i) => {
  let modal = false
  for (let j = i + 1; j < words.length && j <= i + 1 + MAX_FILLER; j++) {
    if (!FILLER.test(words[j])) return { word: words[j], modal }
    if (MODAL.test(words[j])) modal = true
  }
  return null
}

const near = (words, i, test) => {
  const next = nextContentWord(words, i)
  return next !== null && test(next.word)
}

const nearPassive = (words, i) => {
  const next = nextContentWord(words, i)
  return next !== null &&
    (isPassiveViolence(next.word) || (next.modal && INFINITIVE_FI.test(next.word)))
}

const isJoinedCall = word => {
  for (let k = 3; k < word.length - 2; k++) {
    const left = word.slice(0, k)
    const right = word.slice(k)
    if (isViolence(left) && isGroup(right)) return true
  }
  return false
}

const callsForViolence = text => {
  const words = toWords(text)
  return words.some((w, i) =>
    (isViolence(w) && near(words, i, isGroup)) ||
    (isGroup(w) && nearPassive(words, i)) ||
    isJoinedCall(w)
  )
}

const hasFinnishSwearWord = text =>
  toRawWords(text).some(w => FINNISH_WORDS.some(pattern => pattern.test(w)))

const isOffensive = text => {
  if (typeof text !== 'string') return false
  return matcher.hasMatch(text) ||
    matcher.hasMatch(joinSeparatedLetters(text)) ||
    hasFinnishSwearWord(text) ||
    callsForViolence(text)
}

module.exports = { isOffensive }
