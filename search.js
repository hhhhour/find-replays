import fs from 'fs'
import { JSDOM } from 'jsdom'
import { Readable } from 'stream'
import { finished } from 'stream/promises'
import slugify from 'slugify'

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'))
const baseUrl = `https://replays.wesnoth.org/${config.VERSION}`

let searchTerms = {
  save: [],
  title: [],
  modifications: [],
  era: [],
  players: [],
}

fs.readFileSync('./search.txt', 'utf8')
  .split("\n")
  .filter(t => t)
  .map(term => term.toLocaleLowerCase())
  .reduce((terms, term) => {
    const [type, word] = term.split(':')
    if (typeof terms[type] === undefined) {
      throw new Error(`Unrecognized term type: ${type}. Valid values are: save, description, title, modifications, era, players`)
    }
    terms[type].push(word)
    return terms
  }, searchTerms)

const getZeroNumber = (num) => num.toString().padStart('2', '0')

const hasSearchTerms = (text, terms) => {
  const lowerText = text.toLocaleLowerCase()
  return terms.some(t => lowerText.includes(t))
}

const rowHasMatch = (row) => {
  if (searchTerms.save.length) {
    const saveText = row.querySelector('a')?.textContent ?? ''
    if (hasSearchTerms(saveText, searchTerms.save)) {
      return true
    }
  }
  if (!searchTerms.title.length && !searchTerms.modifications.length && !searchTerms.era.length && !searchTerms.players.length) {
    return false
  }
  const descriptionText = row.querySelector('.indexcoldesc')?.textContent ?? ''
  if (searchTerms.title.length) {
    const matches = descriptionText.match(/title:([\s\S]*?)(?:modifications:|era:|players:)/)
    if (matches && hasSearchTerms(matches[1], searchTerms.title)) {
      return true
    }
  }
  if (searchTerms.modifications.length) {
    const matches = descriptionText.match(/modifications:([\s\S]*?)(?:era:|players:)/)
    if (matches && hasSearchTerms(matches[1], searchTerms.modifications)) {
      return true
    }
  }
  if (searchTerms.era.length) {
    const matches = descriptionText.match(/era:([\s\S]*?)(?:players:)/)
    if (matches && hasSearchTerms(matches[1], searchTerms.era)) {
      return true
    }
  }
  if (searchTerms.players.length) {
    const matches = descriptionText.match(/players:([\s\S]*)/)
    if (matches && hasSearchTerms(matches[1], searchTerms.players)) {
      return true
    }
  }
  return false
}

const download = async (url, path) => {
  const r = await fetch(url)
  if (!r.ok) {
    console.log(`Error downloading ${url} to ${path}`)
    return
  }
  const output = fs.createWriteStream(path)
  const nodeStream = Readable.fromWeb(r.body)
  nodeStream.pipe(output)

  await finished(output)
  console.log(`Saved ${url} to ${path}`)
}

const dirUrls = []
let currentDate = new Date(config.START_DATE)
currentDate.setHours(0, 0, 0, 0)
let endDate = new Date()
endDate.setDate(endDate.getDate() -1)
endDate.setHours(0, 0, 0, 0)
while (currentDate.getTime() <= endDate.getTime()) {
  const year = currentDate.getFullYear()
  const month = getZeroNumber(currentDate.getMonth() + 1)
  const day = getZeroNumber(currentDate.getDate())
  dirUrls.push(`${year}/${month}/${day}`)
  currentDate.setDate(currentDate.getDate() + 1)
}

for (const url of dirUrls) {
  console.log(`Looking for replays on ${url}`)
  const replays = await fetch(`${baseUrl}/${url}`)
    .then(r => {
      if (!r.ok) {
        throw new Error(`Error loading replays at ${baseUrl}/${url}`)
      }
      return r
    })
    .then(r => r.text())
    .then(html => new JSDOM(html))
    .then(dom => dom.window.document)
    .then(doc => Array.from(doc.querySelectorAll('tr.even,tr.odd')))
    .then(rows => rows
      .filter(rowHasMatch)
      .map(row => {
        const file = row.querySelector('a')?.href
        const descriptionText = row.querySelector('.indexcoldesc')?.textContent ?? ''
        const date = row.querySelector('.indexcollastmod')?.textContent ?? ''
        const titleMatches = descriptionText.match(/title:([\s\S]*?)(?:modifications:|era:|players:)/)
        return {
          url: `${baseUrl}/${url}/${file}`,
          file,
          title: titleMatches ? titleMatches[1] : '',
          date,
        }
      })
    )
    .catch((e) => console.log(e.message))

    if (replays?.length) {
      for (const replay of replays) {
        const filename = slugify(
          [
            replay.title,
            replay.date,
            replay.file,
          ]
          .filter(f => !!f.trim())
          .join('-')
        )
        await download(replay.url, `./replays/${filename}`)
        const lastModified = new Date(replay.date)
        fs.utimesSync(`./replays/${filename}`, lastModified, lastModified)
      }
    }

}
