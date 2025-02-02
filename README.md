# Review Scraper

This project is a web scraper that extracts reviews for a specified company from G2 or Capterra within a given date range. The extracted reviews are saved in a JSON file within a dedicated `reviews` folder.

## Features
- Fetch reviews from G2 or Capterra.
- Validate configuration parameters.
- Parse and extract review data using Cheerio.
- Save reviews as a neatly formatted JSON file.

---

## Installation

1. Clone the repository.
```bash 
 git clone "https://github.com/akhilesh423/scraping.git"
 ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Run the scraper:
   ```bash
   npm start
   ```
---

## Usage

1. Configure the scraper by editing the `config` object in the `main` function:

```typescript
const config: ScraperConfig = {
    companyName: 'paypal',
    startDate: new Date('2023-01-01'),
    endDate: new Date('2025-12-31'),
    source: 'G2'
};
```
2. Paste G2 Browser Cookie:

```text
403 Forbidden error when scraping data from the G2 website you need to mimic the browser's request headers and parameters closely, including copying the exact Cookie value from your browser when accessing the G2 site. This approach makes the server think the requests are coming from a legitimate browser session.
```

3. Run the script:
```bash
npm start
```

4. The scraped reviews will be saved in the `reviews` folder as a JSON file named after the company.

---

---

## Example Output

For `companyName = 'paypal'`, the output will be saved as `reviews/paypal.json` with content:
```json
[
  {
    "title": "Great Payment Solution",
    "description": "PayPal has made my life easier.",
    "date": "2023-02-15T00:00:00.000Z",
    "rating": 5,
    "reviewerName": "John Doe"
  },
  ...
]
```