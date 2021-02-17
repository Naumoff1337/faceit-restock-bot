// Telegram
import { Telegraf } from 'telegraf'

// Database
import pool from './database/db'

// Other
import * as request from 'request'

// For Faceit API
const options = {
    url: 'https://api.faceit.com/shop/v1/item'
}

function init(): void {
    const bot = new Telegraf('')

    bot.start(async (ctx: any) => {
        ctx.reply(`Hi there! 🙂\nCommand List:\n/add [item] — add an item\n/my — see my subscriptions\n/delete [item] — delete an item`)
    })

    bot.command('add', async (ctx: any) => {
        try {
            const userMessage = (ctx.message.text).replace('/add ', '')
            const telegramID = ctx.message.chat.id
            if (userMessage === '/add' || userMessage === '') {
                ctx.reply(`You have entered an empty value 🚫`)
                return false
            }

            request(options, async (error: any, response: any, body: any) => {
                if (error) throw error

                if (!error && response.statusCode === 200) {
                    const result = (JSON.parse(body)).payload
                    const faceitItem = result.filter((item: any) => {
                        return item.name.toLowerCase().includes(userMessage.toLowerCase())
                    })[0]
                    if(faceitItem === undefined || faceitItem === -1 || faceitItem === false) {
                        ctx.reply(`The item name you have entered does not exist 🚫 Please check that you typed the item name correctly and try again❗️`)
                    } else {
                        ctx.reply(await addItem(faceitItem.name, faceitItem.category, telegramID))
                    }
                }
            })
        } catch(e) {
            console.log(e)
            ctx.reply('Something went wrong ⁉️')
        }
    })

    bot.command('my', async (ctx: any) => {
        try {
            const telegramID = ctx.message.chat.id
            const items = await pool.query(`SELECT faceit_name FROM items WHERE telegram_id = $1`, [telegramID])
            const userItems = items.rows

            if (userItems.length === 0) {
                ctx.reply(`You don't have any active subscriptions 🚫`)
            } else {
                let replyMessage = 'You are subscribed to the following items:\n'
                for (const key in userItems) {
                    replyMessage += `${userItems[key].faceit_name}\n`
                }
                ctx.reply(replyMessage)
            }
        } catch(e) {
            console.log(e)
            ctx.reply('Something went wrong ⁉️')
        }
    })

    bot.command('delete', async (ctx: any) => {
        try {
            const telegramID = ctx.message.chat.id
            const userMessage = (ctx.message.text).replace('/delete ', '')

            if (userMessage === '/delete' || userMessage === '') {
                ctx.reply(`You have entered an empty value 🚫`)
                return false
            }

            await pool.query(`DELETE FROM items WHERE telegram_id = $1 AND faceit_name = $2`, [telegramID, userMessage])
            ctx.reply(`You are no longer subscribed to this item ✅`)
        } catch(e) {
            console.log(e)
            ctx.reply('Something went wrong.')
        }
    })

    bot.on('text', async (ctx) => {
        await ctx.reply(`Please use any command from the command list❗️\n\nCommand List:\n/add [item] — add an item\n/my — see my subscriptions\n/delete [item] — delete an item`)
    })

    // Adding item to DB
    async function addItem(itemName: any, itemCategory: any, telegramID: any): Promise<any> {
        try {
            await pool.query(`INSERT INTO items(faceit_name, category, telegram_id) values($1, $2, $3);`, [itemName, itemCategory, telegramID])
            return `${itemName} — has been successfully added to your subscriptions ✅`
        } catch(e) {
            if (e.code === '23505') {
                return 'You have already added this item to your subscriptions❗️'
            } else {
                return 'Some kind of error has occurred with the database 🚫 Try adding your item later ⁉️'
            }
        }
    }

    // Checks for an item
    async function checkQuanity(): Promise<any> {
        try {
            const items = await pool.query(`SELECT * FROM items`)
            const allItems = items.rows
            request(options, async (error: any, response: any, body: any) => {
                if (error) throw error
                
                if (!error && response.statusCode === 200) {
                    const result = (JSON.parse(body)).payload
                    for (const key in allItems) {
                        const userItem = result.filter((item: any) => {
                            return item.name.toLowerCase().includes((allItems[key].faceit_name).toLowerCase())
                        })[0]
                        if (userItem.quantity > 0) {
                            bot.telegram.sendMessage(allItems[key].telegram_id, `The item has appeared in the FACEIT Shop: ${allItems[key].faceit_name}✅\n You will no longer receive notifications about it❗️`)
                            await pool.query(`DELETE FROM items WHERE telegram_id = $1 AND faceit_name = $2`, [allItems[key].telegram_id, allItems[key].faceit_name])
                        }
                    }
                }
            })
        } catch (e) {
            console.log(e)
        }
    }

    bot.launch()

    setInterval(checkQuanity, 10000)
}

init()