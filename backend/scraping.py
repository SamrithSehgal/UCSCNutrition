from bs4 import BeautifulSoup
import requests
from datetime import date

today = date.today().strftime("%m%%2f%d%%2f%Y")

urls = {
    "John R. Lewis & College Nine": f"https://nutrition.sa.ucsc.edu/longmenu.aspx?sName=UC+Santa+Cruz+Dining&locationNum=40&locationName=John+R.+Lewis+%26+College+Nine+Dining+Hall&naFlag=1&WeeksMenus=UCSC+-+This+Week%27s+Menus&dtdate={today}&mealName=",
    "Cowell & Stevenson": f"https://nutrition.sa.ucsc.edu/longmenu.aspx?sName=UC+Santa+Cruz+Dining&locationNum=05&locationName=Cowell+%26+Stevenson+Dining+Hall&naFlag=1&WeeksMenus=UCSC+-+This+Week%27s+Menus&dtdate={today}&mealName=",
    "Crown & Merrill": f"https://nutrition.sa.ucsc.edu/longmenu.aspx?sName=UC+Santa+Cruz+Dining&locationNum=20&locationName=Crown+%26+Merrill+Dining+Hall&naFlag=1&WeeksMenus=UCSC+-+This+Week%27s+Menus&dtdate={today}&mealName=",
    "Porter & Kresge": f"https://nutrition.sa.ucsc.edu/longmenu.aspx?sName=UC+Santa+Cruz+Dining&locationNum=25&locationName=Porter+%26+Kresge+Dining+Hall&naFlag=1&WeeksMenus=UCSC+-+This+Week%27s+Menus&dtdate={today}&mealName=",
    "Rachel Carson & Oakes": f"https://nutrition.sa.ucsc.edu/longmenu.aspx?sName=UC+Santa+Cruz+Dining&locationNum=30&locationName=Rachel+Carson+%26+Oakes+Dining+Hall&naFlag=1&WeeksMenus=UCSC+-+This+Week%27s+Menus&dtdate={today}&mealName=",
}
meals = ["Breakfast", "Lunch", "Dinner"]
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

    # Name
    name_div = soup.find('div', class_='labelrecipe')
    if name_div:
        nutrition['name'] = name_div.get_text(strip=True)

    # Serving size and calories are in the rowspan=8 td
    # "Serving Size" label and its value are two consecutive size=5 fonts
    # "Calories 123" is a single size=5 bold font
    info_td = soup.find('td', attrs={'rowspan': '8'})
    if info_td:
        size5 = info_td.find_all('font', attrs={'size': '5'})
        for i, font in enumerate(size5):
            text = font.get_text(strip=True)
            if 'Serving Size' in text and i + 1 < len(size5):
                nutrition['Serving Size'] = size5[i + 1].get_text(strip=True)
            elif 'Calories' in text:
                nutrition['Calories'] = toNumber(text.replace('Calories', '').strip())

    # Nutrient rows live in the inner table (direct parent of the rowspan td)
    # Rows 1-5 have 4 tds each: (name+amount, %DV, name+amount, %DV)
    # Row 6 has the vitamin colspan td
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

        # Vitamins are in row 6 inside a nested table
        if len(rows) > 6:
            vitamin_row = rows[6]
            for td in vitamin_row.select('table tr td'):
                fonts = td.find_all('font')
                if len(fonts) == 2:
                    name = fonts[0].get_text(strip=True)
                    pct = fonts[1].get_text(strip=True).replace('\xa0', '').strip()
                    if name and '%' in pct:
                        nutrition[KEY_MAP.get(name, name)] = toNumber(pct.strip())

    # Ingredients
    ingredients = soup.find('span', class_='labelingredientsvalue')
    if ingredients:
        nutrition['Ingredients'] = ingredients.get_text(strip=True)

    # Allergens
    allergens = soup.find('span', class_='labelallergensvalue')
    if allergens:
        nutrition['Allergens'] = allergens.get_text(strip=True)

    return nutrition


def getData():
    for place, baseUrl in urls.items():
        allFoodTree[place] = {}
        for meal in meals:
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
                recipes.append(res)

            allFoodTree[place][meal] = recipes

    return allFoodTree

