import * as fs from 'fs';
import * as cheerio from 'cheerio';
import axios from 'axios';
import path from 'path';

const reviewsFolder = path.join(__dirname, 'reviews');

interface Review {
    title: string;
    description: string;
    date: string;
    rating?: number | any;
    reviewerName?: string;
}

interface ScraperConfig {
    companyName: string;
    startDate: Date;
    endDate: Date;
    source: 'G2' | 'CAPTERRA';
}

const SOURCES: any = {
    G2: 'https://g2.com/products',
};

function parseHTML(html: string, config: ScraperConfig): Review[] {
    const $ = cheerio.load(html);
    const reviews: Review[] = [];

    $('[itemprop="review"]').each((i, el) => {
        const title = $(el).find('[itemprop="name"]').text().trim().replace(/"/g, '');;
        const date = new Date($(el).find('[itemprop="datePublished"]').attr('content') || '');
        const rating = $(el).find('[itemprop="ratingValue"]').attr('content');
        const reviewerName = $(el).find('[itemprop="author"]').text().trim();
        const description = $(el).find('[itemprop="reviewBody"]').text().trim().replace(/Review collected by and hosted on G2\.com\./g, '');


        if (date >= config.startDate && date <= config.endDate) {
            reviews.push({ title, description, date: date.toISOString(), rating, reviewerName });
        }
    });

    return reviews;
}


function validateConfig(config: ScraperConfig): void {
    if (!config.companyName) throw new Error('Company name is required');
    if (isNaN(config.startDate.getTime())) throw new Error('Invalid start date');
    if (isNaN(config.endDate.getTime())) throw new Error('Invalid end date');
    if (config.startDate > config.endDate) throw new Error('Start date must be before end date');
    if (config.source !== 'G2' && config.source !== 'CAPTERRA') throw new Error('Invalid source');
}

async function fetchHTML(url: string, config: ScraperConfig): Promise<string> {
    try {
        const response = await axios.get(url, {
            headers: { 
                'accept': 'text/html, */*; q=0.01', 
                'accept-language': 'en-US,en-IN;q=0.9,en-GB;q=0.8,en;q=0.7', 
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 
                'priority': 'u=1, i', 
                'referer': `https://www.g2.com/products/${config.companyName}/reviews`, 
                'sec-ch-device-memory': '8', 
                'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"', 
                'sec-ch-ua-arch': '""', 
                'sec-ch-ua-full-version-list': '"Google Chrome";v="131.0.6778.265", "Chromium";v="131.0.6778.265", "Not_A Brand";v="24.0.0.0"', 
                'sec-ch-ua-mobile': '?1', 
                'sec-ch-ua-model': '"Nexus 5"', 
                'sec-ch-ua-platform': '"Android"', 
                'sec-fetch-dest': 'empty', 
                'sec-fetch-mode': 'cors', 
                'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36', 
                'Cookie': '' // go the g2 website copy the cookie and paste here. 
              }
              
        });
        return response.data;
    } catch (error) {
        throw new Error(`Failed to fetch HTML: ${(error as Error).message}`);
    }
}

async function scrapeReviews(config: ScraperConfig): Promise<any> {
    validateConfig(config);
    let allReviews: Review[] = [];
    const totalPages = 5;
    for (let page = 1; page <= totalPages; page++) {
        if (config.source === 'G2') {
            const url = `${SOURCES.G2}/${config.companyName.toLowerCase()}/reviews?page=${page}&_pjax=%23pjax-container`;
            console.log(`Scraping data from ${url} (Page ${page})...`);
            const getHtml = await fetchHTML(url, config);
            const reviews = parseHTML(getHtml, config);
            console.log(`Scraped ${reviews.length} reviews from page ${page}.`);
            allReviews = [...allReviews, ...reviews];
        }
    }
    return allReviews;
}

async function main() {
    const config: ScraperConfig = {
        companyName: 'close',    // add the company name here.
        startDate: new Date('2023-01-01'),
        endDate: new Date('2025-12-31'),
        source: 'G2'
    };

    try {
        const reviews = await scrapeReviews(config);
        fs.writeFileSync(path.join(reviewsFolder, `${config.companyName}.json`), JSON.stringify(reviews, null, 2));
        console.log(`Successfully saved ${reviews.length} reviews to reviews.json`);
    } catch (error) {
        console.error('Error:', (error as Error).message);
    }
}

main();
