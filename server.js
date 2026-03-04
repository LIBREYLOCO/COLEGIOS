const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve all static files from the root directory
app.use(express.static(path.join(__dirname)));

// Fallback: any unknown route returns index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`L&L Sistema corriendo en puerto ${PORT}`);
});
