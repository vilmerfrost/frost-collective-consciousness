# Troubleshooting Moonshot API 401 Error

## Verifierat: Koden är korrekt ✅

- ✅ Använder `MOONSHOT_API_KEY` (inte KIMI_API_KEY)
- ✅ API endpoint: `https://api.moonshot.cn/v1/chat/completions`
- ✅ Model namn: `moonshotai/Kimi-K2-Thinking`
- ✅ API-nyckeln finns i .env.local (51 tecken, börjar med sk-)

## Problem: API-nyckeln är ogiltig eller inte aktiverad

När ALLA API-anrop ger 401 (även models endpoint), betyder det att API-nyckeln själv är ogiltig.

## Steg för att fixa:

### 1. Verifiera på Moonshot Platform

Gå till: https://platform.moonshot.cn/

Kontrollera:
- [ ] Din API-nyckel finns i "API Keys" sektionen
- [ ] API-nyckeln är **aktiverad** (inte pausad eller raderad)
- [ ] API-nyckeln är **skapad för rätt konto** (om du har flera konton)
- [ ] **Billing är aktiverat** och kontot har credits
- [ ] Du har **behörighet** för Kimi K2 Thinking modellen

### 2. Skapa en HELT NY API-nyckel

1. Gå till https://platform.moonshot.cn/
2. Gå till "API Keys" sektionen
3. **Radera** den gamla nyckeln (om den finns)
4. Klicka "Create New API Key"
5. **Kopiera nyckeln EXAKT** när den visas (du kan inte se den igen!)
6. Kopiera HELA nyckeln (börjar med `sk-` och är ~51 tecken)

### 3. Uppdatera .env.local

Öppna `.env.local` och UPPDATERA raden:

```bash
MOONSHOT_API_KEY=sk-din-nya-nyckel-här
```

**VIKTIGT:**
- ✅ Ingen mellanslag före eller efter `=`
- ✅ Inga citattecken runt nyckeln
- ✅ Ingen trailing whitespace
- ✅ Kopiera nyckeln EXAKT som den visas

### 4. Testa API-nyckeln direkt

Efter att ha uppdaterat .env.local, testa:

```bash
source .env.local
curl https://api.moonshot.cn/v1/chat/completions \
  -H "Authorization: Bearer $MOONSHOT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"moonshotai/Kimi-K2-Thinking","messages":[{"role":"user","content":"test"}]}'
```

Om detta ger 401, är API-nyckeln fortfarande ogiltig.

### 5. Starta om dev-servern HELT

1. Stoppa dev-servern (Ctrl+C)
2. Vänta 5 sekunder
3. Starta om: `npm run dev`

### 6. Kontakta Moonshot Support

Om allt ovan inte fungerar:
- API-nyckeln kanske inte är helt aktiverad än
- Det kan finnas ett problem med ditt Moonshot-konto
- Kontakta Moonshot support på platform.moonshot.cn

## Vanliga problem:

1. **API-nyckel kopierad fel** - Kontrollera att inga extra mellanslag eller tecken
2. **Nyckel inte aktiv än** - Kan ta några minuter att aktiveras
3. **Fel konto** - Se till att du är inloggad på rätt Moonshot-konto
4. **Billing inte aktiverat** - Billing måste vara aktivt OCH ha credits
5. **Nyckel skapad för annan region** - Vissa API-nycklar fungerar bara i vissa regioner

## Verifiera att det fungerar:

När API-nyckeln fungerar, ska du få en JSON-response med `choices` istället för 401-error.

