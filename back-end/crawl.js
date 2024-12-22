const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { promisify } = require('util');
const readline = require('readline');
const stream = require('stream');

const writeFileAsync = promisify(fs.writeFile);
const appendFileAsync = promisify(fs.appendFile);

const types = [2, 3, 6, 7, 10, 11, 12, 13, 16, 17];

const crawl = async () => {
  try {
    const linkStream = fs.createWriteStream('link.txt', { flags: 'a', encoding: 'utf-8' });

    for (const type of types) {
      for (let i = 1; i <= 6; i++) {
        const response = await axios.get(`https://tuoitre.vn/timeline/${type}/trang-${i}.htm`);
        const $ = cheerio.load(response.data);
        $('h3 a').each((_, element) => {
          linkStream.write(`https://tuoitre.vn${$(element).attr('href')}\n`);
        });
      }
    }

    linkStream.end();

    const fileStream = fs.createReadStream('link.txt', { encoding: 'utf-8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const dataStream = fs.createWriteStream('data.json', { flags: 'a', encoding: 'utf-8' });

    for await (const url of rl) {
      try {
        const response = await axios.get(url.trim());
        const $ = cheerio.load(response.data);
        const title = $('h1.detail-title').text().replace(/"/g, "'").trim();
        const description = $('h2.detail-sapo').text().replace(/"/g, "'").trim();
        const time = $('.detail-time').text().trim();
        const body = $('.detail-content');
        let paragram = '';
        body.find('p').each((_, element) => {
          if (!$(element).attr('data-placeholder') && (!$(element).attr('class') || $(element).attr('class') !== 'VCObjectBoxRelatedNewsItemSapo')) {
            paragram += $(element).text();
          }
        });

        const data = {
          title: title.replace(/\n/g, ''),
          description: description.replace(/\n/g, ''),
          date: time.replace(/\n/g, ''),
          link: url.trim(),
          paragram: paragram.replace(/"/g, "'").replace(/\n/g, '').trim()
        };

        dataStream.write(`${JSON.stringify(data)},\n`);
      } catch (error) {
        console.error(`Error processing URL ${url.trim()}:`, error);
      }
    }

    dataStream.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

module.exports = {
  crawl
}