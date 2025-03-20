require("dotenv").config();
const { 
    Client, 
    GatewayIntentBits, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once("ready", () => {
    console.log("I am ready!");
});

const prefix = "?";
const userSessions = new Map();
client.on("messageCreate", async (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    if (message.content.startsWith(`${prefix}allo`)) {
        message.channel.send("Oui ?");
    }

    // Command ?login -> Authentification
    if (message.content.startsWith(`${prefix}login`)) {
        // Création du bouton pour ouvrir le modal
        const authButton = new ButtonBuilder()
            .setCustomId("openAuthModal")
            .setLabel("S'authentifier")
            .setStyle(ButtonStyle.Primary);

        const buttonRow = new ActionRowBuilder().addComponents(authButton);

        // Envoi du message avec le bouton
        await message.reply({ 
            content: "Clique sur le bouton ci-dessous pour t'authentifier.", 
            components: [buttonRow],
        });
    }
});

// Gérer l'interaction avec le bouton
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === "openAuthModal") {
        // Création du modal d'authentification
        const modal = new ModalBuilder()
            .setCustomId("authModal")
            .setTitle("Authentification");

        const loginInput = new TextInputBuilder()
            .setCustomId("login")
            .setLabel("Identifiant ETNA")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const passwordInput = new TextInputBuilder()
            .setCustomId("password")
            .setLabel("Mot de passe ETNA")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const actionRow1 = new ActionRowBuilder().addComponents(loginInput);
        const actionRow2 = new ActionRowBuilder().addComponents(passwordInput);

        modal.addComponents(actionRow1, actionRow2);

        await interaction.showModal(modal);
    }
});

// Gérer l'envoi du formulaire (modal)
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === "authModal") {
        const login = interaction.fields.getTextInputValue("login");
        const password = interaction.fields.getTextInputValue("password");

        try {
            // Authentification avec le serveur ETNA
            const loginResponse = await fetch("https://auth.etna-alternance.net/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ login, password })
            });

            if (!loginResponse.ok) throw new Error(`Login failed: ${loginResponse.statusText}`);

            const cookie = loginResponse.headers.get("set-cookie");
            if (!cookie) throw new Error("Aucun Cookie recu lors de l'authentification.");

            userSessions.set(interaction.user.id, cookie); // Stocker le cookie temporairement

            await interaction.reply({ content: "Authentification réussie ✅", ephemeral: true });

        } catch (err) {
            console.error("Erreur lors de l'authentification:", err);
            await interaction.reply({ content: "Échec de l'authentification ❌", ephemeral: true });
        }
    }
});

// Commande ?profile -> Récupère les infos de l'utilisateur
client.on("messageCreate", async (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    if (message.content.startsWith(`${prefix}profile`)) {
        const userId = message.author.id;

        // Vérifie si l'utilisateur est authentifié
        if (!userSessions.has(userId)) {
            return message.reply("⚠️ Tu dois d'abord te connecter avec `?login`.");
        }

        const cookie = userSessions.get(userId);

        try {
            // Récupère les infos utilisateur avec le cookie
            const identityResponse = await fetch("https://auth.etna-alternance.net/identity", {
                method: "GET",
                headers: {
                    "Cookie": cookie
                }
            });

            if (!identityResponse.ok) {
                userSessions.delete(userId);
                return message.reply("❌ La session a expiré, tu dois te reconnecter.");
            }

            const userData = await identityResponse.json();
            
            // Envoie les infos utilisateur sur Discord
            message.channel.send(`>>> ## **__Information :__**\n\n👤 **Utilisateur:** ${userData.login}\n📧 **Email:** ${userData.email}\n🟨 **Role:** ${userData.groups}`);
            
        } catch (err) {
            console.error("Erreur lors de la récupération des infos:", err);
            message.channel.send("❌ Erreur lors de la récupération de tes informations.");
        }
    }
});

client.on("messageCreate", async (message) => {
    if (message.content.startsWith(`${prefix}logout`)) {
        const userId = message.author.id;

        // Vérifie si l'utilisateur est authentifié
        if (!userSessions.has(userId)) {
            return message.reply("⚠️ Tu n'est pas connecté actuellement.");
        }

        userSessions.delete(userId);
        message.reply("Tu est maintenant déconnecté. Utilise `?login` pour te reconnecter.")
    }
})

client.on("messageCreate", async (message) => {
    if (!message.content.startsWith(`${prefix}info`) || message.author.bot) return;        
        
    const userId = message.author.id;

    // Vérifie si l'utilisateur est authentifié
    if (!userSessions.has(userId)) {
        return message.reply("⚠️ Tu dois d'abord te connecter avec `?login`.");
    }

    const cookie = userSessions.get(userId);

    try {
        // Récupération des informations utilisateur pour obtenir le login
        const identityResponse = await fetch("https://auth.etna-alternance.net/identity", {
            method: "GET",
            headers: { "Cookie": cookie }
        });


        if (!identityResponse.ok) {
            userSessions.delete(userId);
            return message.reply("❌ La session a expiré, tu dois te reconnecter.");
        }

        const userData = await identityResponse.json();

        const wallsResponse = await fetch(`https://prepintra-api.etna-alternance.net/walls`, {
            method: "GET",
            headers: { "Cookie": cookie }
        })
        const wallsData = await wallsResponse.json();
        console.log("wall :",wallsData);

        const notifResponse = await fetch(`https://prepintra-api.etna-alternance.net/students/${userData.login}/informations`, {
            method: "GET",
            headers: { "Cookie": cookie }
        })
        const notifData = await notifResponse.json();
        console.log(notifData);

    } catch (err) {
        console.error("Erreur lors de la récupération des activités:", err);
        message.reply("❌ Une erreur est survenue lors de la récupération de tes activités.");
    }
})

client.login(process.env.BOT_TOKEN);
