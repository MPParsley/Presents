# Gift Name Shuffler

A simple static web app for organizing Secret Santa and gift exchanges.

**Live App:** https://mpparsley.github.io/Presents/

## Features

- Manage persons, groups, and occasions
- Cross-group shuffling: each person is assigned someone from a **different** group
- Business rules enforced: no self-assignments, no same-group assignments, no repeats from previous editions
- View assignment history by edition
- Import/export data as JSON for sharing
- Export data as RDF (Turtle format)
- **SOLID Pod integration** for decentralized wishlist management
- No backend required - all data stored in browser localStorage

## How It Works

1. **Create Groups**: Groups represent families or teams who should NOT give gifts to each other
2. **Add Persons**: Add people and assign each to their group
3. **Create Occasions**: Add events like "Christmas 2025"
4. **Shuffle**: Run a shuffle to assign each person a recipient from a different group

## Usage

Just open `index.html` in a browser or visit the live URL above.

---

## SOLID Wishlist Integration

De app ondersteunt [SOLID](https://solidproject.org/) (Social Linked Data) voor gedecentraliseerd wishlist-beheer. Hiermee kun je:

- **Eigenaar zijn van je eigen wishlist data** - opgeslagen in jouw persoonlijke Pod
- **Veilig delen** - alleen wie jij toestemming geeft kan je wishlist zien
- **Interoperabiliteit** - data in open standaard formaat (RDF/Linked Data)

### Wat is SOLID?

SOLID is een specificatie ontwikkeld door Tim Berners-Lee (uitvinder van het web) waarmee je data opslaat in een persoonlijke "Pod" die je zelf beheert. Je bepaalt wie toegang heeft tot welke data.

### Stap 1: Maak een Solid Pod aan

Je hebt een gratis Solid Pod nodig. Kies een provider:

| Provider | Locatie | Registratie |
|----------|---------|-------------|
| [solidcommunity.net](https://solidcommunity.net/register) | UK | Voor developers/early adopters |
| [solidweb.org](https://solidweb.org/register) | EU | Grassroots community |
| [solidweb.me](https://solidweb.me) | EU | Meisdata |
| [inrupt.net](https://inrupt.net) | - | Inrupt (commercieel) |

**Let op:**
- Username moet lowercase zijn, alleen letters a-z en cijfers 0-9
- Deze servers zijn voor testen/ontwikkeling - sla geen gevoelige data op

### Stap 2: Inloggen in de app

1. Ga naar de sectie **"Mijn Solid Pod"**
2. Kies je provider uit de dropdown
3. Klik **"Inloggen met Solid"**
4. Je wordt doorgestuurd naar je provider om in te loggen
5. Na succesvolle login kom je terug in de app

### Stap 3: Wishlist beheren

Na inloggen:

1. Klik **"Beheer Mijn Wishlist"**
2. Voeg items toe met:
   - **Naam** - wat je graag wilt hebben
   - **Beschrijving** (optioneel) - extra details
   - **Link** (optioneel) - URL naar product
   - **Prioriteit** - 1-5 sterren
3. Items worden automatisch opgeslagen in je Pod

### Stap 4: Koppel je account aan je naam

Om je wishlist zichtbaar te maken voor anderen:

1. Ga naar de **"Persons"** sectie
2. Zoek je eigen naam in de lijst
3. Klik **"Koppel Solid"** naast je naam
4. Je WebID wordt nu gekoppeld aan je persoon

Na koppeling verschijnt een groene **"Solid"** badge bij je naam.

### Stap 5: Reveal Links Delen

Na een shuffle kan de organisator **persoonlijke reveal links** delen:

1. Ga naar **Shuffle & Assignments**
2. Selecteer de occasion en edition
3. Klik op **"Link"** naast elke toewijzing
4. De link wordt gekopieerd - stuur deze naar de deelnemer

De deelnemer opent `reveal.html?data=...` en ziet:
- Wie ze een cadeau moeten geven
- De wishlist van die persoon (indien beschikbaar)
- De mogelijkheid om hun eigen wishlist te beheren

### Stap 6: Wishlists bekijken

Bij de **Assignments** (in de hoofdapp of op de reveal pagina):

- Elke ontvanger met een gekoppelde Solid Pod toont een **"Wishlist"** knop
- Klik om de wishlist van je ontvanger te bekijken
- Items worden direct uit hun Pod opgehaald

### Technische Details

#### Data opslag

Wishlists worden opgeslagen als RDF in Turtle formaat:

```
Pod URL: https://username.solidcommunity.net/
Wishlist: /public/giftshuffler-wishlist.ttl
```

#### Vocabularies gebruikt

- `schema:ItemList` - de wishlist container
- `schema:ListItem` - individuele items
- `schema:name`, `schema:description`, `schema:url` - item eigenschappen
- `seg:priority` - custom prioriteit (1-5)

#### Voorbeeld RDF

```turtle
@prefix schema: <http://schema.org/> .
@prefix seg: <https://segersrosseel.be/ns/gift#> .

<#item-abc123> a schema:ListItem ;
    schema:name "Nintendo Switch" ;
    schema:description "OLED versie in wit" ;
    schema:url <https://bol.com/product> ;
    schema:position 1 ;
    seg:priority 5 .
```

#### Privacy & Toegang

- Wishlists worden opgeslagen in `/public/` folder (publiek leesbaar)
- Alleen de eigenaar kan schrijven (via SOLID authenticatie)
- Voor private wishlists: wijzig ACL permissies in je Pod

#### Offline & Caching

- Wishlists worden lokaal gecached voor snelle toegang
- Bij netwerkproblemen wordt de cache getoond
- Cache wordt automatisch bijgewerkt bij succesvolle fetch

#### JSON Export

Solid koppelingen worden meegenomen in JSON export:

```json
{
  "solidProfiles": {
    "personId123": {
      "webId": "https://user.solidcommunity.net/profile/card#me",
      "wishlistUrl": "https://user.solidcommunity.net/public/giftshuffler-wishlist.ttl",
      "linkedAt": 1702473600000
    }
  }
}
```

### Bronnen

- [SOLID Project](https://solidproject.org/) - Officiële website
- [Get a Pod](https://solidproject.org/users/get-a-pod) - Pod providers overzicht
- [Inrupt Documentation](https://docs.inrupt.com/) - Developer documentatie
- [SOLID Forum](https://forum.solidproject.org/) - Community support
