const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { promisify } = require('util');
const readline = require('readline');
const { addData } = require('./elastic');
const cron = require('node-cron');

const writeFileAsync = promisify(fs.writeFile);
const appendFileAsync = promisify(fs.appendFile);

const types = [2, 3, 6, 7, 10, 11, 12, 13, 16, 17];


const crawl = async () => {
  try {
    const linkStream = fs.createWriteStream('link.txt', { flags: 'a', encoding: 'utf-8' });
    let linkCount = 0;
    const maxLinks = 50;

    for (const type of types) {
      if (linkCount >= maxLinks) break;
      for (let i = 1; i <= 6; i++) {
        if (linkCount >= maxLinks) break;
        const response = await axios.get(`https://tuoitre.vn/timeline/${type}/trang-${i}.htm`);
        const $ = cheerio.load(response.data);
        $('h3 a').each((_, element) => {
          if (linkCount < maxLinks) {
            linkStream.write(`https://tuoitre.vn${$(element).attr('href')}\n`);
            linkCount++;
          }
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

const cronJobCrawl  = cron.schedule('0 23 * * *', async () => {
  try {
    console.log('Crawling data...');
    await crawl();
  }catch(error){
    console.error('Error:', error);
  }
})

const cronJob =   cron.schedule('15 23 * * *', async () => {
  try {
    console.log('Add data...');
    const dataStream = fs.createReadStream('data.json', { encoding: 'utf-8' });
    const rl = readline.createInterface({
      input: dataStream,
      crlfDelay: Infinity
    });
    const results = [];
    for await (const data of rl) {
      const dataRs = data.slice(0, -1);
      const dataJson = JSON.parse(dataRs);
      results.push(dataJson);
    }
    await addData(results);
    fs.unlinkSync('data.json');
    fs.unlinkSync('link.txt');
    console.log('Crawling done');
  } catch (error) {
    console.error('Error:', error);
  }
});

module.exports = {
  crawl,
  cronJob,
  cronJobCrawl
}