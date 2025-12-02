# 🔍 Verifiera Moonshot API-nyckel

Din API-nyckel ser korrekt ut (51 tecken, börjar med `sk-`), men får fortfarande 401-fel. Följ denna checklista:

## ✅ Checklista på Moonshot Platform

Gå till: **https://platform.moonshot.cn/**

### 1. Kontrollera API Key Status
- [ ] Logga in på rätt konto
- [ ] Gå till "API Keys" sektionen
- [ ] Kontrollera att din nyckel:
  - [ ] Status = **Active** (inte Paused eller Deleted)
  - [ ] Expiration date = Har inte gått ut
  - [ ] Key börjar med `sk-` och är ~51 tecken

### 2. Kontrollera Billing
- [ ] Gå till "Billing" eller "Account" sektionen
- [ ] Verifiera att:
  - [ ] Billing är **aktiverat** (inte disabled)
  - [ ] Du har **credits kvar** ($15 som du nämnde)
  - [ ] Inga betalningsproblem (expired card, etc.)

### 3. Verifiera Model Access
- [ ] Kontrollera att ditt konto har tillgång till:
  - [ ] `kimi-k2-thinking` model
  - [ ] Eventuella region-restriktioner?

### 4. Kopiera API Key EXAKT
- [ ] På Moonshot platform:
  - [ ] Klicka på din API key
  - [ ] Kopiera den **EXAKT** (ingen whitespace före/efter)
  - [ ] Inga citattecken eller extra tecken

### 5. Uppdatera .env.local
```bash
# Öppna .env.local
# Sätt:
MOONSHOT_API_KEY=sk-din-nya-nyckel-här

# INGA mellanslag, INGA citattecken!
```

### 6. Testa Direkt i Terminal
```bash
# Ladda .env.local
source .env.local

# Testa models endpoint
curl https://api.moonshot.cn/v1/models \
  -H "Authorization: Bearer $MOONSHOT_API_KEY"

# Om det ger 401 = nyckeln är ogiltig
# Om det fungerar = testa chat completions
```

### 7. Om Allt Ovan Misslyckas

**Möjliga orsaker:**

1. **API Key Activation Delay**
   - Vissa API-nycklar behöver 5-10 minuter att aktiveras
   - Vänta och testa igen

2. **Region Restrictions**
   - Vissa konton har region-begränsningar
   - Kontakta Moonshot support

3. **Account Status**
   - Kontot kan vara under verifiering
   - Check spam-mappen för verifieringsmail

4. **Model Access**
   - Ditt konto kanske inte har tillgång till `kimi-k2-thinking`
   - Prova `kimi-k2-0905-preview` istället

## 🧪 Testa Med Olika Models

Om `kimi-k2-thinking` inte fungerar, prova:

```bash
# Test 1: kimi-k2-thinking
curl https://api.moonshot.cn/v1/chat/completions \
  -H "Authorization: Bearer $MOONSHOT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"kimi-k2-thinking","messages":[{"role":"user","content":"test"}]}'

# Test 2: kimi-k2-0905-preview
curl https://api.moonshot.cn/v1/chat/completions \
  -H "Authorization: Bearer $MOONSHOT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"kimi-k2-0905-preview","messages":[{"role":"user","content":"test"}]}'
```

## 📞 Kontakta Moonshot Support

Om inget av ovanstående fungerar:
- Email: support@moonshot.cn (eller kontakt via platform)
- Beskriv: "401 Invalid Authentication error despite active API key with credits"
- Inkludera: Ditt konto-ID och API key prefix (första 6 tecken)

## ⚠️ VIKTIGT: Om Du Ändrar API Key

**Du MÅSTE starta om dev-servern:**

```bash
# 1. Stoppa servern (Ctrl+C)
# 2. Vänta 5 sekunder
# 3. Starta om:
npm run dev
```

Next.js läser `.env.local` bara vid start, så ändringar kräver omstart!

---

**Test skriptet:**
```bash
node scripts/test-moonshot-api.js
```

Detta kommer testa din API-nyckel och ge dig exakt felmeddelande.
