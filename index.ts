import * as fs from 'fs';
import * as cheerio from 'cheerio';
import axios from 'axios';
import path from 'path';

const reviewsFolder = path.join(__dirname, 'reviews');
interface Review {
    title: string;
    description: string;
    date: string;
    rating?: number;
    reviewerName?: string;
    pros?: string;
    cons?: string;
}

interface ScraperConfig {
    companyName: string;
    startDate: Date;
    endDate: Date;
    source: 'G2' | 'CAPTERRA';
}

const SOURCES = {
    G2: 'https://www.g2.com/products',
    CAPTERRA: 'https://www.capterra.in/reviews',
};

async function getProductId(companyName: string): Promise<string> {
    const searchUrl = `https://www.capterra.in/search/?q=${encodeURIComponent(companyName)}`;
    const response = await axios.get(searchUrl);
    const $ = cheerio.load(response.data);
    const productLink = $(`a.entry[href^="/software/"][href*="${companyName.toLowerCase()}"]`).first();
    if (productLink.length) {
        const href = productLink.attr('href');
        return href!.split('/')[2];
    }
    throw new Error(`Product ID not found for ${companyName}`);
}

function parseHTML(html: string, config: ScraperConfig): Review[] {
    const $ = cheerio.load(html);
    const reviews: Review[] = [];
    const dateRange = (date: Date) => date >= config.startDate && date <= config.endDate;

    if (config.source === 'G2') {
        $('[itemprop="review"]').each((_, el) => {
            const title = $(el).find('[itemprop="name"]').text().trim();
            const date = new Date($(el).find('[itemprop="datePublished"]').attr('content') || '');
            const rating = parseFloat($(el).find('[itemprop="ratingValue"]').attr('content') || '0');
            const reviewerName = $(el).find('[itemprop="author"]').text().trim();
            const description = $(el).find('[itemprop="reviewBody"]').text().trim().replace(/Review collected by and hosted on G2\.com\./g, '');
            if (dateRange(date)) {
                reviews.push({ title, description, date: date.toISOString(), rating, reviewerName });
            }
        });
    } else if (config.source === 'CAPTERRA') {
        $('.review-card').each((_, el) => {
            const title = $(el).find('h3.h5.fw-bold').text().trim();
            const reviewerName = $(el).find('.h5.fw-bold').first().text().trim();
            const date = $(el).find('.text-ash .ms-2').text().trim();
            const description = $(el).find('p:contains("Comments:") span').text().trim();
            const rating = parseFloat($(el).find('.star-rating-component .ms-1').first().text().trim());
            const pros = $(el).find('p:contains("Pros:") + p').text().trim();
            const cons = $(el).find('p:contains("Cons:") + p').text().trim();
            reviews.push({reviewerName, title, description, date: date, rating, pros, cons });

        });
    }
    return reviews;
}

async function fetchHTML(url: string, config: ScraperConfig): Promise<string> {
    try {
        const headers: any = {
            'accept': 'text/html, */*; q=0.01',
            'accept-language': 'en-US,en-IN;q=0.9,en-GB;q=0.8,en;q=0.7',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
        };
        // For G2 we need browser cookie in headers to bypass the cloudflare protection and aviod 403 error.
        if (config.source === 'G2') {
            headers['referer'] = `https://www.g2.com/products/${config.companyName}/reviews`;
            headers['priority'] = 'u=1, i';
            headers['sec-ch-ua'] = '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"';
            headers['sec-ch-ua-mobile'] = '?1';
            headers['sec-ch-ua-platform'] = '"Android"';
            headers['Cookie'] = ''; // Add G2 cookie here
        }
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        throw new Error(`Failed to fetch HTML: ${(error as Error).message}`);
    }
}

async function scrapeReviews(config: ScraperConfig): Promise<Review[]> {
    validateConfig(config);
    let allReviews: Review[] = [];
    const totalPages = 5;

    for (let page = 1; page <= totalPages; page++) {
        try {
            let url: string;
            if (config.source === 'G2') {
                url = `${SOURCES.G2}/${config.companyName.toLowerCase()}/reviews?page=${page}`;
            } else {
                const productId = await getProductId(config.companyName);
                url = `${SOURCES.CAPTERRA}/${productId}/${config.companyName.toLowerCase()}`;
            }
            console.log(`Fetching data from ${url}...`);
            const html = await fetchHTML(url, config);
            const reviews = parseHTML(html, config);
            console.log(`Fetched ${reviews.length} reviews from page ${page}`)
            allReviews = allReviews.concat(reviews);
        } catch (error) {
            console.error(`Error scraping page ${page}: ${(error as Error).message}`);
        }
    }
    return allReviews;
}

function validateConfig(config: ScraperConfig): void {
    if (!config.companyName) throw new Error('Company name is required');
    if (isNaN(config.startDate.getTime())) throw new Error('Invalid start date');
    if (isNaN(config.endDate.getTime())) throw new Error('Invalid end date');
    if (config.startDate > config.endDate) throw new Error('Start date must be before end date');
    if (!['G2', 'CAPTERRA'].includes(config.source)) throw new Error('Invalid source');
}

async function main() {

    const config: ScraperConfig = {
        companyName: 'pipedrive',
        startDate: new Date('2023-01-01'),  // try this by running npm start
        endDate: new Date('2025-12-31'),
        source: 'CAPTERRA',
    };

    // const config: ScraperConfig = {
    //     companyName: 'pipedrive',
    //     startDate: new Date('2023-01-01'),
    //     endDate: new Date('2025-12-31'),
    //     source: 'G2',
    // };

    try {
        const reviews = await scrapeReviews(config);
        const outputPath = path.join(reviewsFolder, `${config.companyName}_${config.source.toLowerCase()}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(reviews, null, 2));
        console.log(`Saved ${reviews.length} reviews to ${outputPath}`);
    } catch (error) {
        console.error('Error:', (error as Error).message);
    }
}

main();
