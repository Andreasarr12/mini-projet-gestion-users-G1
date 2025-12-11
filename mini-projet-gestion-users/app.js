// app.js

// 1. On importe les modules nécessaires
const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');

const db = require('./db'); // connexion MySQL

// 2. On crée l'application Express
const app = express();

// 3. Middlewares globaux

// Pour lire les données des formulaires (POST)
app.use(bodyParser.urlencoded({ extended: false }));

// Pour lire le JSON envoyé par fetch()
app.use(bodyParser.json());

// Pour servir les fichiers statiques (HTML, CSS, JS) du dossier "public"
app.use(express.static(path.join(__dirname, 'public')));

// Pour gérer les sessions (authentification)
app.use(session({
  secret: 'mini-projet-secret', // chaîne utilisée pour signer la session
  resave: false,
  saveUninitialized: false
}));

// 4. Route de test de base
app.get('/', (req, res) => {
  res.send('Hello Yann, ton serveur Express fonctionne !');
});

// 5. Route pour tester la base (on peut la garder pour debug)
app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM utilisateur');
    res.json(rows);
  } catch (error) {
    console.error('Erreur de connexion à la base :', error);
    res.status(500).send('Erreur de connexion à la base de données');
  }
});

// 6. AUTHENTIFICATION

// 6.1. Afficher la page de login
app.get('/login', (req, res) => {
  // On renvoie le fichier login.html qui est dans le dossier "public"
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 6.2. Traitement du formulaire de login
app.post('/login', async (req, res) => {
  const { login, password } = req.body; // récupère les champs du formulaire

  try {
    // On cherche l'utilisateur dans la base
    const [rows] = await db.query(
      'SELECT * FROM utilisateur WHERE login = ? AND password = ?',
      [login, password]
    );

    if (rows.length === 0) {
      // Aucun utilisateur trouvé -> on renvoie vers /login avec ?error=1
      return res.redirect('/login?error=1');
    }

    const user = rows[0];

    // On stocke l'utilisateur en session
    req.session.user = {
      id: user.id,
      prenom: user.prenom,
      nom: user.nom,
      role: user.role
    };

    // Redirection vers la page protégée
    res.redirect('/users');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

// 6.3. Déconnexion
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// 7. Middleware pour protéger les routes
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

// 8. Page protégée de test (plus tard ce sera la gestion des utilisateurs)
app.get('/users', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'users.html'));
});

// 9. API : récupérer la liste des utilisateurs (protégée aussi)
app.get('/api/users', requireAuth, async (req, res) => {
  const search = req.query.search || ''; // récupère ?search=...

  try {
    let sql = 'SELECT * FROM utilisateur';
    let params = [];

    if (search) {
      sql += ' WHERE prenom LIKE ? OR nom LIKE ? OR login LIKE ?';
      const like = `%${search}%`;
      params = [like, like, like];
    }

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// 10. API : ajouter un utilisateur
app.post('/api/users', requireAuth, async (req, res) => {
  const { prenom, nom, login, password, role } = req.body;

  // Vérification très simple (pour le mini-projet)
  if (!prenom || !nom || !login || !password || !role) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
  }

  try {
    await db.query(
      'INSERT INTO utilisateur (prenom, nom, login, password, role) VALUES (?, ?, ?, ?, ?)',
      [prenom, nom, login, password, role]
    );

    res.status(201).json({ message: 'Utilisateur créé' });
  } catch (err) {
    console.error(err);
    // Si le login existe déjà (clé UNIQUE)
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Ce login existe déjà' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 11. API : supprimer un utilisateur
app.delete('/api/users/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM utilisateur WHERE id = ?', [id]);
    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 12. API : modifier un utilisateur
app.put('/api/users/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { prenom, nom, login, password, role } = req.body;

  if (!prenom || !nom || !login || !password || !role) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
  }

  try {
    await db.query(
      'UPDATE utilisateur SET prenom = ?, nom = ?, login = ?, password = ?, role = ? WHERE id = ?',
      [prenom, nom, login, password, role, id]
    );

    res.json({ message: 'Utilisateur mis à jour' });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Ce login existe déjà' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 12. Lancer le serveur
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
