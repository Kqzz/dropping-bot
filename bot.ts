import * as Discord from 'discord.js';
const client = new Discord.Client();

import { JSDOM } from 'jsdom';
import { writeFileSync } from 'fs';
import { PRIORITY_BELOW_NORMAL } from 'node:constants';

let config = require('./config.json');

client.on('ready', () => {
	console.log('Dropping ready!');
});

async function getEmbedFromURL(url: string, startTimestamp: number) {
	const dom = await JSDOM.fromURL(url);
	const nameElement = dom.window.document.querySelectorAll(
		'body > main > div > div.col-md-6.col-lg-7.order-md-3 > div > div.card-body.p-0 > div:nth-child(1) > div.col.col-lg.order-lg-1.text-nowrap.text-ellipsis > a'
	);
	if (nameElement.length === 0)
		return new Discord.MessageEmbed()
			.setTitle('Error')
			.setColor(0xff0000)
			.setDescription('No results found.');
	let views = dom.window.document.querySelectorAll(
		'body > main > div > div.col-md-6.col-lg-7.order-md-3 > div > div.card-body.p-0 > div:nth-child(1) > div.col-auto.col-lg.order-lg-3.text-right.tabular'
	)[0].innerHTML;
	const data = {
		name: nameElement[0].innerHTML,
		views: views === '‒' ? 0 : views,
		droptime: new Date(
			Date.parse(
				dom.window.document
					.querySelectorAll(
						'body > main > div > div.col-md-6.col-lg-7.order-md-3 > div > div.card-body.p-0 > div:nth-child(1) > div.col-12.col-lg-5.order-lg-2.text-lg-center > time'
					)[0]
					.getAttribute('datetime')
			)
		)
			.toLocaleString('en-US', {
				hour12: true,
				timeZone: 'Europe/London',
				timeZoneName: 'short'
			})
			.replace(',', '')
	};
	return new Discord.MessageEmbed()
		.setTitle(
			url.includes('length_op=eq') ? 'Next 3char' : 'Next Name Dropping'
		)
		.setColor(0x00ff00)
		.addFields([
			{
				name: 'Name',
				value: data.name
			},
			{
				name: 'Views',
				value: data.views
			},
			{
				name: 'Droptime',
				value: data.droptime
			}
		])
		.setFooter(`Result generated in ${Date.now() - startTimestamp}ms`);
}

client.on('message', async (message) => {
	if (message.author.bot) return;
	if (!message.content.startsWith(config.prefix)) return;
	const command = message.content.split(' ')[0].substring(config.prefix.length);
	const args = message.content.split(' ').splice(1);
	const startTimestamp = Date.now();
	switch (command) {
		case 'help':
			return message.channel.send(
				new Discord.MessageEmbed()
					.setTitle('Commands')
					.setColor(0x00ffff)
					.setDescription(
						['help', 'prefix <prefix>', 'next <?view_count>', '3char'].join(
							'\n'
						)
					)
			);
			break;
		case 'prefix':
			if (!message.member.roles.cache.has(config.mod_id))
				return new Discord.MessageEmbed()
					.setTitle('Error')
					.setColor(0xff0000)
					.setDescription('You must be a moderator to use this command!');
			if (!args[0])
				return new Discord.MessageEmbed()
					.setTitle('Error')
					.setColor(0xff0000)
					.setDescription('You must specify a prefix to change to!');
			config.prefix = args[0];
			writeFileSync('config.json', JSON.stringify(config, null, 4));
			return message.channel.send('Successfully changed prefix to ' + args[0]);
		case 'next':
			const nextURL = `https://namemc.com/minecraft-names${
				!isNaN(Number(args[0]))
					? `?sort=asc&length_op=&length=3&lang=&searches=${args[0]}`
					: ''
			}`;
			return message.channel.send(
				await getEmbedFromURL(nextURL, startTimestamp)
			);
		case '3char':
			const threeCharURL =
				'https://namemc.com/minecraft-names?sort=asc&length_op=eq&length=3&lang=&searches=0';
			return message.channel.send(
				await getEmbedFromURL(threeCharURL, startTimestamp)
			);
		default:
			return message.channel.send(
				new Discord.MessageEmbed()
					.setTitle('Error')
					.setColor(0xff0000)
					.setDescription('Invalid command.')
			);
	}
});

client.on('guildCreate', (guild) => {
	if (guild.id != config.server_id) guild.leave();
});

client.login(config.token);
