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
- No backend required - all data stored in browser localStorage

## How It Works

1. **Create Groups**: Groups represent families or teams who should NOT give gifts to each other
2. **Add Persons**: Add people and assign each to their group
3. **Create Occasions**: Add events like "Christmas 2025"
4. **Shuffle**: Run a shuffle to assign each person a recipient from a different group

## Usage

Just open `index.html` in a browser or visit the live URL above.
