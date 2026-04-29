from bs4 import BeautifulSoup
import requests
from datetime import date

def _make_urls():
    today = date.today().strftime("%m%%2f%d%%2f%Y")
    B = f"https://nutrition.sa.ucsc.edu/longmenu.aspx?sName=UC+Santa+Cruz+Dining&locationNum={{num}}&locationName={{name}}&naFlag=1&WeeksMenus=UCSC+-+This+Week%27s+Menus&dtdate={today}&mealName="
    return {
        # Dining Halls
        "John R. Lewis & College Nine": B.format(num=40, name="John+R.+Lewis+%26+College+Nine+Dining+Hall"),
        "Cowell & Stevenson": B.format(num="05", name="Cowell+%26+Stevenson+Dining+Hall"),
        "Crown & Merrill": B.format(num=20, name="Crown+%26+Merrill+Dining+Hall"),
        "Porter & Kresge": B.format(num=25, name="Porter+%26+Kresge+Dining+Hall"),
        "Rachel Carson & Oakes": B.format(num=30, name="Rachel+Carson+%26+Oakes+Dining+Hall"),
        # Cafes & Markets
        "Banana Joe's": B.format(num=21, name="Banana+Joe%27s"),
        "Oakes Cafe": B.format(num=23, name="Oakes+Cafe"),
        "Global Village Cafe": B.format(num=46, name="Global+Village+Cafe"),
        "Owl's Nest Cafe": B.format(num=24, name="Owl%27s+Nest+Cafe"),
        "UCen Coffee Bar": B.format(num=45, name="UCen+Coffee+Bar+%26+Bistro"),
        "Stevenson Coffee House": B.format(num=26, name="Stevenson+Coffee+House"),
        "Perk Coffee Bar": B.format(num=22, name="Perk+Coffee+Bar"),
        "Porter Market": B.format(num=50, name="Porter+Market"),
        "Merrill Market": B.format(num=47, name="Merrill+Market"),
    }

location_meals = {
    "John R. Lewis & College Nine": ["Breakfast", "Lunch", "Dinner", "Late+Night"],
    "Cowell & Stevenson": ["Breakfast", "Lunch", "Dinner", "Late+Night"],
    "Crown & Merrill": ["Breakfast", "Lunch", "Dinner"],
    "Porter & Kresge": ["Breakfast", "Lunch", "Dinner"],
    "Rachel Carson & Oakes": ["Breakfast", "Lunch", "Dinner", "Late+Night"],
    "Banana Joe's": ["Late+Night"],
    "Oakes Cafe": ["Breakfast", "After+11am"],
    "Global Village Cafe": ["Menu"],
    "Owl's Nest Cafe": ["Breakfast", "All"],
    "UCen Coffee Bar": ["Menu"],
    "Stevenson Coffee House": ["Menu"],
    "Perk Coffee Bar": ["ALL"],
    "Porter Market": ["Menu"],
    "Merrill Market": ["Menu"],
}

base = "https://nutrition.sa.ucsc.edu/"

headers = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-encoding": "gzip, deflate, br, zstd",
    "accept-language": "en-US,en;q=0.9",
    "cache-control": "max-age=0",
    "connection": "keep-alive",
    "cookie": "nmstat=b9ce7c98-76b8-90b8-989e-3541fed664d5; PS_DEVICEFEATURES=width:1707 height:1067 pixelratio:1.5 touch:0 geolocation:1 websockets:1 webworkers:1 datepicker:1 dtpicker:1 timepicker:1 dnd:1 sessionstorage:1 localstorage:1 history:1 canvas:1 svg:1 postmessage:1 hc:0 maf:0; _ga=GA1.1.1586938998.1767989266; _ga_BWJ4Z4Y66X=GS2.1.s1775513281$o9$g0$t1775513285$j56$l0$h0; WebInaCartDates=; WebInaCartMeals=; WebInaCartRecipes=; WebInaCartQtys=; WebInaCartLocation=40",
    "dnt": "1",
    "host": "nutrition.sa.ucsc.edu",
    "referer": "https://nutrition.sa.ucsc.edu/shortmenu.aspx?sName=UC+Santa+Cruz+Dining&locationNum=40&locationName=John+R.+Lewis+%26+College+Nine+Dining+Hall&naFlag=1",
    "sec-ch-ua": '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
}

allFoodTree = {}

def toNumber(s):
    try:
        digits = ''.join(c for c in s if c.isdigit() or c == '.')
        if not digits:
            return None
        n = float(digits)
        return int(n) if n == int(n) else n
    except:
        return None

KEY_MAP = {
    "Tot. Fat":       "Total Fat",
    "Sat. Fat":       "Saturated Fat",
    "Trans Fat":      "Trans Fat",
    "Chol.":          "Cholesterol",
    "Tot. Carb.":     "Total Carbohydrate",
    "Dietary Fiber":  "Dietary Fiber",
    "Diet. Fiber":    "Dietary Fiber",
    "Tot. Sugars":    "Total Sugars",
    "Sugars":         "Total Sugars",
    "Added Sugars":   "Added Sugars",
    "Protein":        "Protein",
    "Sodium":         "Sodium",
    "Vit. D":         "Vitamin D",
    "Vitamin D":      "Vitamin D",
    "Vitamin D - mcg": "Vitamin D",
    "Calcium":        "Calcium",
    "Iron":           "Iron",
    "Potassium":      "Potassium",
}

def parseLabel(html):
    soup = BeautifulSoup(html, 'html.parser')
    nutrition = {}

    name_div = soup.find('div', class_='labelrecipe')
    if name_div:
        nutrition['name'] = name_div.get_text(strip=True)

    info_td = soup.find('td', attrs={'rowspan': '8'})
    if info_td:
        size5 = info_td.find_all('font', attrs={'size': '5'})
        for i, font in enumerate(size5):
            text = font.get_text(strip=True)
            if 'Serving Size' in text and i + 1 < len(size5):
                nutrition['Serving Size'] = size5[i + 1].get_text(strip=True)
            elif 'Calories' in text:
                nutrition['Calories'] = toNumber(text.replace('Calories', '').strip())

    if info_td:
        inner_table = info_td.find_parent('table')
        container = inner_table.find('tbody') or inner_table
        rows = container.find_all('tr', recursive=False)

        for row in rows[1:6]:
            tds = row.find_all('td', recursive=False)
            if len(tds) != 4:
                continue
            for i in range(0, 4, 2):
                amount_td = tds[i]
                dv_td = tds[i + 1]
                fonts = amount_td.find_all('font')
                if len(fonts) < 2:
                    continue
                key = fonts[0].get_text(strip=True).replace('\xa0', ' ').strip()
                val = fonts[1].get_text(strip=True)
                if not key or not val:
                    continue
                nutrition[KEY_MAP.get(key, key)] = toNumber(val)

        if len(rows) > 6:
            vitamin_row = rows[6]
            for td in vitamin_row.select('table tr td'):
                fonts = td.find_all('font')
                if len(fonts) == 2:
                    name = fonts[0].get_text(strip=True)
                    pct = fonts[1].get_text(strip=True).replace('\xa0', '').strip()
                    if name and '%' in pct:
                        nutrition[KEY_MAP.get(name, name)] = toNumber(pct.strip())

    ingredients = soup.find('span', class_='labelingredientsvalue')
    if ingredients:
        nutrition['Ingredients'] = ingredients.get_text(strip=True)

    allergens = soup.find('span', class_='labelallergensvalue')
    if allergens:
        nutrition['Allergens'] = allergens.get_text(strip=True)

    return nutrition


def getData():
    urls = _make_urls()
    for place, baseUrl in urls.items():
        allFoodTree[place] = {}
        for meal in location_meals[place]:
            labels = []
            req = requests.get(url=baseUrl + meal, headers=headers)
            soup = BeautifulSoup(req.content, 'html.parser')
            for div in soup.find_all('div', class_=['longmenucolmenucat', 'longmenucoldispname']):
                if 'longmenucolmenucat' in div.get('class', []):
                    if 'Cereal' in div.get_text():
                        break
                else:
                    link = div.find('a')
                    if link and link.get('href') and 'label.aspx' in link.get('href'):
                        labels.append(link.get('href'))
            print(len(labels))

            recipes = []
            for label in labels:
                nutritionReq = requests.get(base + label, headers=headers)
                res = parseLabel(nutritionReq.content)
                if res.get("Calories") is None:
                    continue
                recipes.append(res)

            allFoodTree[place][meal] = recipes

    return allFoodTree

