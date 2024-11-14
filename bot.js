const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Define tokens and IDs
const DISCORD_TOKEN = 'MTMwNjMzNDE2MTMwMDM2MTI2Ng.GulPEJ.v1-GbwiCLhfHDWBB13ZJXKSRBT9TxeErHjjE5E';
const CLIENT_ID = '1306334161300361266';
const CLIENT_SECRET = 'FMZUPgHRPGSJFdQe7hbCExCUVxY8YjjB';
const IPINFO_TOKEN = '64ccb423141df9';
const VERIFIED_ROLE_ID = 'your_verified_role_id';
const GUILD_ID = 'your_guild_id';
const VERIFICATION_CHANNEL_ID = 'your_verification_channel_id'; // Where the bot will send verified IP addresses

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const app = express();
app.use(express.json());

// Initialize commands on the bot
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    const guild = client.guilds.cache.get(GUILD_ID);
    if (guild) {
        await guild.commands.create(
            new SlashCommandBuilder()
                .setName('verify')
                .setDescription('Starts the verification process')
        );
    }
});

// Fetch IP details from IPinfo
async function getIpInfo(ip) {
    const response = await fetch(`https://ipinfo.io/${ip}?token=${IPINFO_TOKEN}`);
    return response.json();
}

// Handle /verify command
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'verify') return;

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('Verification Required')
        .setDescription(
            'Click the button below to verify your IP address. ' +
            'Please make sure to review our terms of service before proceeding.'
        );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('Verify Now')
            .setStyle(ButtonStyle.Link)
            .setURL('https://your-verification-page.com') // Replace with actual verification page URL
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
});

// IP verification endpoint
app.post('/verify-ip', async (req, res) => {
    const { ip, userId } = req.body;

    // Retrieve IP details
    const ipInfo = await getIpInfo(ip);
    console.log(`IP Info: ${JSON.stringify(ipInfo)}`);

    // Load or create info.json
    const filePath = path.resolve(__dirname, 'info.json');
    let data = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : [];

    // Check for duplicate IPs
    const existingEntry = data.find(entry => entry.ip === ip);
    if (existingEntry) {
        return res.status(200).json({ message: 'IP already registered' });
    }

    // Add new IP data to info.json
    data.push({ ip, timestamp: new Date().toISOString(), ipInfo });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    // Send IP info to verification channel
    const guild = client.guilds.cache.get(GUILD_ID);
    if (guild) {
        const verificationChannel = guild.channels.cache.get(VERIFICATION_CHANNEL_ID);
        if (verificationChannel) {
            const embed = new EmbedBuilder()
                .setTitle('New Verified IP Address')
                .setDescription(`IP: ${ip}\nLocation: ${ipInfo.city}, ${ipInfo.region}, ${ipInfo.country}\nOrganization: ${ipInfo.org}`)
                .setColor(0x00FF00)
                .setTimestamp();

            verificationChannel.send({ embeds: [embed] });
        }

        // Assign role if new IP
        try {
            const member = await guild.members.fetch(userId);
            await member.roles.add(VERIFIED_ROLE_ID);
            return res.status(200).json({ message: 'Role assigned successfully' });
        } catch (err) {
            console.error('Error assigning role:', err);
            return res.status(500).json({ message: 'Error assigning role' });
        }
    } else {
        return res.status(400).json({ message: 'Guild not found' });
    }
});

// Start the bot and express server
client.login(DISCORD_TOKEN);
app.listen(3000, () => console.log('Bot server running on port 3000'));
