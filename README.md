# Hushållskassan

Budget och beslutsstöd för sambohushåll. Ren HTML/CSS/JS utan bygg-steg. Datan sparas lokalt i webbläsaren (localStorage).

## Publicera på GitHub Pages

1. Skapa ett repo på GitHub och ladda upp innehållet i den här mappen (filerna ska ligga i repots rot).
2. Repo → Settings → Pages → *Deploy from a branch* → branch `main`, mapp `/ (root)`.
3. Efter någon minut finns sidan på `https://<användare>.github.io/<repo>/`.

Alla sökvägar är relativa, så appen fungerar även under en undermapp som `/<repo>/`.

## Lägg på iPhone

Öppna adressen i Safari → Dela → *Lägg till på hemskärmen*.

## Köra lokalt

```
python -m http.server 8080
```

Öppna sedan http://localhost:8080. Service worker kräver http(s), inte `file://`.

## Uppdatera efter ändringar

Höj versionen i `CACHE` i `sw.js` (t.ex. `hushallskassan-v2`) så att installerade kopior hämtar nya filer.

## Regler och belopp

Alla belopp och regler ligger i `rules.js` med källa och kontrolldatum. Uppdatera värdet och datumet tillsammans. Appen varnar när något är äldre än 180 dagar.
