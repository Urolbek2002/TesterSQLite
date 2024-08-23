
/// Delete key


require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.resolve(__dirname, 'bot-database.sqlite');

const token = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

const adminChatId = '1903429740';
const groupId = -1002214424711;
const groupUrl = 'https://t.me/TesterUz_chat';


let db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('SQLite database connection error:', err);
        process.exit(1);
    }
    else {
        console.log('Connected to SQLite database.');

        // Jadval mavjudligini tekshirish va kerakli jadvallarni yaratish
        db.run(`CREATE TABLE IF NOT EXISTS admins (
            chatId TEXT PRIMARY KEY,
            name TEXT,
            date DATETIME
        )`, (err) => {
            if (err) {
                console.error('Error creating "admins" table:', err);
            } else {
                console.log('Ensured "admins" table exists.');
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS registeredUsers (
            chatId TEXT PRIMARY KEY,
            name TEXT
        )`, (err) => {
            if (err) {
                console.error('Error creating "registeredUsers" table:', err);
            } else {
                console.log('Ensured "registeredUsers" table exists.');
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS answerKeys (
            adminId TEXT,
            login TEXT,
            key TEXT,
            text TEXT,
            FOREIGN KEY(adminId) REFERENCES admins(chatId)
        )`, (err) => {
            if (err) {
                console.error('Error creating "answerKeys" table:', err);
            } else {
                console.log('Ensured "answerKeys" table exists.');
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS submissions (
            name TEXT,
            login TEXT,
            adminId TEXT,
            chatId TEXT,
            result TEXT,
            createdAt DATETIME,
            FOREIGN KEY(chatId) REFERENCES registeredUsers(chatId)
        )`, (err) => {
            if (err) {
                console.error('Error creating "submissions" table:', err);
            } else {
                console.log('Ensured "submissions" table exists.');
            }
        });
    }
});

let registerBool = false;

const registerKeyboard = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '📲 Ro\'yxatdan o\'tish', callback_data: 'register' }],
            [{ text: '☑️Test topshirish', callback_data: 'test' }],
            [{ text: '👨🏻‍💻 Adminlik', callback_data: 'admin' }],
            [{ text: '💡 Tizimda ishlash', callback_data: 'info' }],
            [{ text: '📲 Guruh havolasi', url: groupUrl }],
            [{ text: '🔗 Dasturchi havolasi', url: `tg://user?id=${adminChatId}` }]
        ]
    }
};

const adminLink = [{ text: '🔗 Dasturchi havolasi', url: `tg://user?id=${adminChatId}` }]

let add_admin = false;
let delete_admin = false;
let test_id = false, javoblar = false, kombinatsiya = false;
let set_key_results = []
let delete_key = false;
let admin_key = false;
let test_key = false;
let natija = false;
let result = []
let registerId = null;
let mesId = null;

bot.on('callback_query', async callbackQuery => {
    const message = callbackQuery.message;
    const messageId = callbackQuery.message.message_id;
    mesId = messageId;
    const fromId = callbackQuery.from.id;

    db.get(`SELECT * FROM admins WHERE chatId = ?`, [fromId.toString()], async (err, admin) => {
        if (err) {
            console.error('Error fetching admin:', err);
        }

        db.get(`SELECT * FROM registeredUsers WHERE chatId = ?`, [fromId.toString()], async (err, user) => {
            if (err) {
                console.error('Error fetching user:', err);
            }

            // Callback query logic
            if (callbackQuery.data === 'register') {
                bot.getChatMember(groupId, fromId).then(async (data) => {
                    if (data.status === 'left' || data.status === 'kicked') {
                        bot.editMessageText('Botdan foydalanish uchun guruhga a\'zo bo\'lishingiz kerak.', {
                            chat_id: fromId,
                            message_id: messageId,
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '🔗 Guruh havolasi', url: groupUrl }],
                                    [{ text: ' ✅ Tekshirish', callback_data: 'back' }]
                                ]
                            }
                        })
                    } else {
                        db.get(`SELECT * FROM registeredUsers WHERE chatId = ?`, [fromId.toString()], (err, userExists) => {
                            if (err) {
                                console.error('Error checking user existence:', err);
                            }

                            if (!userExists) {
                                registerBool = true;
                                bot.sendMessage(fromId, 'Familiya va ismingizni kiriting:').then(messages => {
                                    registerId = messages.message_id;
                                });
                            } else {
                                bot.editMessageText('Siz oldin ruyhatdan o\'tgansiz!', {
                                    chat_id: fromId,
                                    message_id: messageId,
                                    reply_markup: {
                                        inline_keyboard: [
                                            [{ text: '🔙Orqaga', callback_data: 'back' }]
                                        ]
                                    }
                                })
                            }
                        });
                    }
                }).catch((err) => {
                    console.error(err.message);
                    bot.editMessageText('Nimadir noto\'g\'ri ketdi. Iltimos, keyinroq yana urinib ko\'ring.', {
                        chat_id: fromId,
                        message_id: messageId,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔙Orqaga', callback_data: 'back' }]
                            ]
                        }
                    })
                });

            }
            else if (callbackQuery.data === 'back') {
                set_key_results.length = 0;
                result.length = 0;
                bot.editMessageText('Kerakli bulimni tanlang:', {
                    chat_id: fromId,
                    message_id: messageId,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📲 Ro\'yxatdan o\'tish', callback_data: 'register' }],
                            [{ text: '☑️Test topshirish', callback_data: 'test' }],
                            [{ text: '👨🏻‍💻 Adminlik', callback_data: 'admin' }],
                            [{ text: '💡 Tizimda ishlash', callback_data: 'info' }],
                            [{ text: '📲 Guruh havolasi', url: groupUrl }],
                            [{ text: '🔗 Dasturchi havolasi', url: `tg://user?id=${adminChatId}` }]
                        ]
                    }
                })
            }
            else if (callbackQuery.data === 'info') {
                bot.editMessageText('Savollaringizni guruhga yozishingiz mumkin.\nKo\'p suraladigan savollar:', {
                    chat_id: fromId,
                    message_id: messageId,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔍Kombinatsiya', url: 'https://t.me/TesterUz_chat/49' }],
                            [{ text: '🗝Kalitlar', url: 'https://t.me/TesterUz_chat/51' }],
                            [{ text: '👥Adminlik huquqlari', url: 'https://t.me/TesterUz_chat/53' }],
                            [{ text: '🔙Orqaga', callback_data: 'back' }]
                        ]
                    }
                })
            }
            else if (callbackQuery.data === 'admin') {
                bot.getChatMember(groupId, fromId).then(async (data) => {
                    if (data.status === 'left' || data.status === 'kicked') {
                        bot.editMessageText('Botdan foydalanish uchun guruhga a\'zo bo\'lishingiz kerak.', {
                            chat_id: fromId,
                            message_id: messageId,
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '🔗 Guruh havolasi', url: groupUrl }],
                                    [{ text: ' ✅ Tekshirish', callback_data: 'back' }]
                                ]
                            }
                        })
                    }
                    else if (admin || fromId.toString() === adminChatId) {
                        set_key_results.length = 0;
                        result.length = 0;
                        bot.editMessageText('Kerakli bulimni tanlang:', {
                            chat_id: fromId,
                            message_id: messageId,
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '👥Admin Qo\'shish', callback_data: 'add_admin' }],
                                    [{ text: '🗑Admin O\'chirish', callback_data: 'delete_admin' }],
                                    [{ text: '🔑Kalit Qo\'shish', callback_data: 'set_key' }],
                                    [{ text: '📔Kalitlarni Ko\'rish', callback_data: 'get_keys' }],
                                    [{ text: '❌Kalitni O\'chirish', callback_data: 'delete_key' }],
                                    [{ text: '📓Adminlar Ro\'yxati', callback_data: 'list_admins' }],
                                    [{ text: '🔙Orqaga', callback_data: 'back' }]
                                ]
                            }
                        })
                    } else {
                        bot.editMessageText(' ❌ Sizda adminlik huquqi yoq!\nSotib olish uchun havola👇🏻', {
                            chat_id: fromId,
                            message_id: messageId,
                            reply_markup: {
                                inline_keyboard: [
                                    adminLink,
                                    [{ text: '🔙Orqaga', callback_data: 'back' }]
                                ]
                            }
                        })
                    }
                })

            }
            else if (callbackQuery.data === 'add_admin') {
                if (fromId.toString() === adminChatId) {
                    bot.sendMessage(fromId, 'Admin qo\'shish uchun yangi admin chat ID\'sini kiriting:').then(messages => {
                        registerId = messages.message_id;
                    });
                    add_admin = true;
                }
                else {
                    bot.editMessageText(' ❌ Sizda bu amalni bajarish uchun ruxsat yo\'q.', {
                        chat_id: fromId,
                        message_id: messageId,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔙Orqaga', callback_data: 'admin' }]
                            ]
                        }
                    })
                }
            }
            else if (callbackQuery.data === 'delete_admin') {
                if (fromId.toString() === adminChatId) {
                    bot.sendMessage(fromId, 'Admin o\'chirish uchun admin chat ID\'sini kiriting:').then(messages => {
                        registerId = messages.message_id;
                    });
                    delete_admin = true;
                }
                bot.editMessageText(' ❌ Sizda bu amalni bajarish uchun ruxsat yo\'q.', {
                    chat_id: fromId,
                    message_id: messageId,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔙Orqaga', callback_data: 'admin' }]
                        ]
                    }
                })
            }
            else if (callbackQuery.data === 'set_key') {
                if (admin) {
                    await bot.sendMessage(fromId, 'Test kalitini yarating:').then(messages => {
                        registerId = messages.message_id;
                    });
                    test_id = true;
                } else {
                    bot.editMessageText(' ❌ Sizda adminlik huquqi yoq!\nSotib olish uchun havola👇🏻', {
                        chat_id: fromId,
                        message_id: messageId,
                        reply_markup: {
                            inline_keyboard: [
                                adminLink,
                                [{ text: '🔙Orqaga', callback_data: 'admin' }]
                            ]
                        }
                    })
                }
            }
            else if (callbackQuery.data === 'test') {
                bot.getChatMember(groupId, fromId).then(async (data) => {
                    if (data.status === 'left' || data.status === 'kicked') {
                        bot.editMessageText('Botdan foydalanish uchun guruhga a\'zo bo\'lishingiz kerak.', {
                            chat_id: fromId,
                            message_id: messageId,
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '🔗 Guruh havolasi', url: groupUrl }],
                                    [{ text: ' ✅ Tekshirish', callback_data: 'back' }]
                                ]
                            }
                        })
                    }
                    else if (user) {
                        bot.sendMessage(fromId, 'Admin kalitini kiriting:').then(messages => {
                            registerId = messages.message_id;
                        });
                        admin_key = true;
                    } else {
                        bot.editMessageText(' ❌ Siz ruyhatdan o\'tmagansiz!\nIltimos ruyhatimizga qushiling!', {
                            chat_id: fromId,
                            message_id: messageId,
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '🔙Orqaga', callback_data: 'back' }]
                                ]
                            }
                        })
                    }
                })

            }
            else if (callbackQuery.data === 'get_keys') {
                if (admin) {
                    db.all('SELECT * FROM answerKeys WHERE adminId = ?', [fromId.toString()], async (err, keys) => {
                        if (keys.length > 0) {
                            let response = `Shaxshiy kalitingiz: ${fromId}\n\nTest kalitlaringiz:\n`;
                            keys.forEach((key, index) => {
                                response += `${index + 1}. ${key.login}\n`;
                            });
                            bot.editMessageText(response, {
                                chat_id: fromId,
                                message_id: messageId,
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: '🔙Orqaga', callback_data: 'admin' }]
                                    ]
                                }
                            })
                        } else {
                            bot.editMessageText(`Sizning kalitingiz: ${fromId}\nSizda hali test kalitlar yo\'q.`, {
                                chat_id: fromId,
                                message_id: messageId,
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: '🔙Orqaga', callback_data: 'admin' }]
                                    ]
                                }
                            })
                        }
                    });
                } else {
                    bot.editMessageText(' ❌ Sizda adminlik huquqi yoq!\nSotib olish uchun havola👇🏻', {
                        chat_id: fromId,
                        message_id: messageId,
                        reply_markup: {
                            inline_keyboard: [
                                adminLink,
                                [{ text: '🔙Orqaga', callback_data: 'admin' }]
                            ]
                        }
                    })
                }
            }
            else if (callbackQuery.data === 'delete_key') {
                if (admin) {
                    bot.sendMessage(fromId, 'Test kalitini kiriting:').then(messages => {
                        registerId = messages.message_id;
                    });
                    delete_key = true;
                }
                else {
                    bot.editMessageText(' ❌ Sizda adminlik huquqi yoq!\nSotib olish uchun havola👇🏻', {
                        chat_id: fromId,
                        message_id: messageId,
                        reply_markup: {
                            inline_keyboard: [
                                adminLink,
                                [{ text: '🔙Orqaga', callback_data: 'admin' }]
                            ]
                        }
                    })
                }

            }
            else if (callbackQuery.data === 'list_admins') {

                if (fromId.toString() === adminChatId) {
                    db.all('SELECT * FROM admins', async (err, admins) => {
                        if (admins.length > 0) {
                            try {
                                const workbook = new ExcelJS.Workbook();
                                const worksheet = workbook.addWorksheet('Data');
                                // Hujjat ustunlarini sozlash
                                worksheet.columns = [
                                    { header: 'Date', key: 'date', width: 30 },
                                    { header: 'Name', key: 'name', width: 30 }
                                ];

                                // Adminlar ma'lumotlarini qo'shish
                                admins.forEach(item => {
                                    const date = new Date(item.date);
                                    const year = date.getFullYear();
                                    const month = String(date.getMonth() + 1).padStart(2, '0'); 
                                    const day = String(date.getDate()).padStart(2, '0');
                                    worksheet.addRow({
                                        date: `${year}-${month}-${day}`, // Date'ni to'g'ri formatda yozish
                                        name: item.name
                                    });
                                });
                                const date = new Date();
                                const filePath = path.join(__dirname, `Admins_${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}.xlsx`);
                                await workbook.xlsx.writeFile(filePath);

                                // Faylni yuborish
                                bot.sendDocument(fromId, filePath).then(() => {
                                    // Fayl yuborilgandan so'ng o'chirish
                                    fs.unlink(filePath, (err) => {
                                        if (err) {
                                            console.error('Faylni o\'chirishda xatolik:', err);
                                        } else {
                                            console.log('Fayl muvaffaqiyatli o\'chirildi.');
                                        }
                                    });

                                }).catch(error => {
                                    console.error('Faylni yuborishda xatolik:', error);
                                });
                            } catch (ex) {
                                console.error(ex.message);
                                bot.editMessageText('Adminlarni olishda xatolik yuz berdi.', {
                                    chat_id: fromId,
                                    message_id: messageId,
                                    reply_markup: {
                                        inline_keyboard: [
                                            [{ text: '🔙Orqaga', callback_data: 'admin' }]
                                        ]
                                    }
                                })
                            }
                        } else {
                            bot.editMessageText(' ❌ Adminlar mavjud emas.', {
                                chat_id: fromId,
                                message_id: messageId,
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: '🔙Orqaga', callback_data: 'admin' }]
                                    ]
                                }
                            })
                        }
                    })
                } else {
                    bot.editMessageText(' ❌ Sizda bu amalni bajarish uchun ruxsat yo\'q.', {
                        chat_id: fromId,
                        message_id: messageId,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔙Orqaga', callback_data: 'admin' }]
                            ]
                        }
                    })
                }

            }
        })
    })
})

bot.on('message', async msg => {
    const chatId = msg.chat.id;
    const fromId = msg.from.id;
    const fromUser = msg.from.username;
    const text = msg.text;
    const messageId = msg.message_id;
    if (msg.chat.type != 'private') {
        // if (chatId != groupId) {
        //     bot.deleteMessage(chatId, messageId);
        //     bot.sendMessage(chatId, 'Bu bot guruh yoki kanallar uchun emas! Iltimos adminlik bermang!');
        // }
    }
    else if (text === '/start') {
        bot.deleteMessage(chatId, messageId);
        bot.sendMessage(chatId, 'Xush kelibsiz!\nKerakli bulimni tanlang:', registerKeyboard);
    }
    else if (registerBool) {
        try {
            const insertDB = db.prepare('INSERT INTO registeredUsers (chatId, name) VALUES (?, ?)');
            insertDB.run(fromId.toString(), text);
            bot.deleteMessage(fromId, registerId);
            bot.deleteMessage(fromId, messageId);
            bot.editMessageText('Siz ruyhatdan o\'tdingiz!', {
                chat_id: fromId,
                message_id: mesId,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔙Orqaga', callback_data: 'back' }]
                    ]
                }
            })
            registerBool = false;
        } catch (ex) {
            console.log(ex.message)
        }
    }
    else if (add_admin) {
        add_admin = false;
        const newAdminId = text;
        try {
            db.all('SELECT * FROM registeredUsers WHERE chatId = ?', [text], async (err, userExists) => {
                if (userExists[0]) {
                    db.all('select * from admins where chatId = ?', text, (err, adminExists) => {
                        if (!adminExists[0]) {
                            const insertDB = db.prepare('INSERT INTO admins (name, chatId, date) VALUES (?, ?, ?)');
                            insertDB.run(userExists[0].name, newAdminId, new Date());
                            bot.deleteMessage(fromId, registerId);
                            bot.deleteMessage(fromId, messageId);
                            bot.sendMessage(text, `${userExists[0].name} sizning lavozimingiz oshirildi!\nSizning kalitingiz: ${text}\nBu kalit orqali, foydalanuvchilar sizni topadi. Saqlab quyishni maslahat beraman!`, {
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: '✈️ Saqlash', switch_inline_query: text }],
                                        [{ text: '👨🏻‍💻 Adminlik', callback_data: 'admin' }]
                                    ]
                                }
                            });
                            bot.editMessageText(`Admin ${userExists[0].name} qo'shildi.`, {
                                chat_id: fromId,
                                message_id: mesId,
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: '🔙Orqaga', callback_data: 'admin' }]
                                    ]
                                }
                            })
                        } else {
                            bot.deleteMessage(fromId, registerId);
                            bot.deleteMessage(fromId, messageId);
                            bot.editMessageText(`Admin ${userExists[0].name} allaqachon mavjud.`, {
                                chat_id: fromId,
                                message_id: mesId,
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: '🔙Orqaga', callback_data: 'admin' }]
                                    ]
                                }
                            })
                        }
                    })
                } else {
                    bot.deleteMessage(fromId, registerId);
                    bot.deleteMessage(fromId, messageId);
                    bot.editMessageText(`Ushbu ${fromUser} foydalanuvchi emas!`, {
                        chat_id: fromId,
                        message_id: mesId,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔙Orqaga', callback_data: 'admin' }]
                            ]
                        }
                    })
                }
            })

        } catch (err) {
            console.error('Error adding admin:', err.message);
            bot.deleteMessage(fromId, registerId);
            bot.deleteMessage(fromId, messageId);
            bot.editMessageText('Admin qo\'shishda xatolik yuz berdi.', {
                chat_id: fromId,
                message_id: mesId,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔙Orqaga', callback_data: 'admin' }]
                    ]
                }
            })
        }
    }
    else if (delete_admin) {
        delete_admin = false;
        const fromId = msg.chat.id;
        const adminChatIdToDelete = text;
        try {
            // Adminni o'chirish
            db.get('select * from admins where chatId = ?', [adminChatIdToDelete], async (error, admins) => {
                if (admins) {
                    // Admin bilan bog'liq ma'lumotlarni o'chirish
                    await db.run('delete from admins where chatId = ?', [adminChatIdToDelete]);
                    await db.run('delete from answerKeys where adminId = ?', [adminChatIdToDelete]);
                    await db.run('delete from submissions where chatId = ?', [adminChatIdToDelete]);

                    // Bot orqali xabarlarni o'chirish va yangilash
                    await bot.deleteMessage(fromId, registerId);
                    await bot.deleteMessage(fromId, messageId);

                    await bot.sendMessage(adminChatIdToDelete, `${admins.name} sizning lavozimingiz tushirildi!\nAdminga murojaat qiling!`, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔗 Dasturchi havolasi', url: `tg://user?id=${adminChatId}` }],
                                [{ text: '◀️ Menyu', callback_data: 'back' }]
                            ]
                        }
                    });

                    await bot.editMessageText(`Admin ${admins.name}'ga tegishli barcha ma'lumot o'chirildi!`, {
                        chat_id: fromId,
                        message_id: mesId,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔙Orqaga', callback_data: 'admin' }]
                            ]
                        }
                    });
                } else {
                    await bot.deleteMessage(fromId, registerId);
                    await bot.deleteMessage(fromId, messageId);

                    await bot.editMessageText(`Bu admin topilmadi!`, {
                        chat_id: fromId,
                        message_id: mesId,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔙Orqaga', callback_data: 'admin' }]
                            ]
                        }
                    });
                }
            });




        } catch (err) {
            console.error('Error deleting admin:', err);
            bot.deleteMessage(fromId, registerId);
            bot.deleteMessage(fromId, messageId);
            bot.editMessageText(`Adminni o\'chirishda xatolik yuz berdi.`, {
                chat_id: fromId,
                message_id: mesId,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔙Orqaga', callback_data: 'admin' }]
                    ]
                }
            })
        }
    }
    else if (test_id) {

        db.get('select * from answerKeys where adminId = ? and login = ?', [fromId.toString(), text], async (err, existingKey) => {

            if (existingKey) {
                bot.deleteMessage(fromId, registerId);
                bot.deleteMessage(fromId, messageId);
                bot.sendMessage(fromId, 'Mavjud bo\'lgan kalit kiritildi, Boshqa kalit kiriting:').then(messages => {
                    registerId = messages.message_id;
                });
            }
            else {
                test_id = false;
                set_key_results.push(text);
                bot.deleteMessage(fromId, registerId);
                bot.deleteMessage(fromId, messageId);
                bot.sendMessage(fromId, 'Javoblarni kiriting:').then(messages => {
                    registerId = messages.message_id;
                });
                javoblar = true;
            }
        });
    }
    else if (javoblar) {
        javoblar = false;
        set_key_results.push(text);
        bot.deleteMessage(fromId, registerId);
        bot.deleteMessage(fromId, messageId);
        bot.sendMessage(fromId, 'Testni bosish orqali UzBMB standartiga erishasiz. Kombinatsiya bilan yaxshiroq tanishish uchun "💡 Tizimda ishlash" bulimiga tashrif buyuring!\n\nKombinatsiyani kiriting:', {
            reply_markup: {
                keyboard: [
                    [{ text: "Test" }]], one_time_keyboard: true, resize_keyboard: true,
            }
        }).then(messages => {
            registerId = messages.message_id;
        });
        kombinatsiya = true;
    }
    else if (kombinatsiya) {
        kombinatsiya = false;
        const regex = /^(\d+)_(\d+)-(\d+(\.\d+)?)(\/\d+-(\d+(\.\d+)?))*\/$/;
        const fromId = msg.chat.id;
        const login = set_key_results[0];
        const answerKey = set_key_results[1];
        try {
            if (login && answerKey) {
                if (text.toUpperCase() === 'TEST' || regex.test(text)) {
                    const count = parseInt(text.split('_')[0]);
                    if (count === answerKey.length) {
                        db.run('insert into answerKeys (adminId, login, key, text) values (?, ?, ?, ?)', [fromId.toString(), login, answerKey, text])
                        bot.deleteMessage(fromId, registerId);
                        bot.deleteMessage(fromId, messageId);
                        bot.editMessageText('Javoblar saqlandi.', {
                            chat_id: fromId,
                            message_id: mesId,
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '🔙Orqaga', callback_data: 'admin' }]
                                ]
                            }
                        })
                    } else {
                        bot.deleteMessage(fromId, registerId);
                        bot.deleteMessage(fromId, messageId);
                        bot.editMessageText('Combinatsiyangizdagi javoblar soni javoblar soniga tug\'ri kelmadi.\nSizning javoblaringiz: ' + answerKey, {
                            chat_id: fromId,
                            message_id: mesId,
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '🔙Orqaga', callback_data: 'admin' }]
                                ]
                            }
                        })
                    }
                }
                else {
                    bot.deleteMessage(fromId, registerId);
                    bot.deleteMessage(fromId, messageId);
                    bot.editMessageText('Kombinatsiya kiritishda xatolik bor.', {
                        chat_id: fromId,
                        message_id: mesId,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔙Orqaga', callback_data: 'admin' }]
                            ]
                        }
                    })
                }
            }
            else {
                bot.deleteMessage(fromId, registerId);
                bot.deleteMessage(fromId, messageId);
                bot.editMessageText('Test kalitini yoki javoblarini kiritishda xatolik bor.', {
                    chat_id: fromId,
                    message_id: mesId,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔙Orqaga', callback_data: 'admin' }]
                        ]
                    }
                })
            }

        } catch (err) {
            console.error('Error setting key:', err);
            bot.deleteMessage(fromId, registerId);
            bot.deleteMessage(fromId, messageId);
            bot.editMessageText('Javoblarni saqlashda xatolik yuz berdi.', {
                chat_id: fromId,
                message_id: mesId,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔙Orqaga', callback_data: 'admin' }]
                    ]
                }
            })
        }
    }
    else if (admin_key) {
        db.get('select * from admins where chatId = ?', text, async (err, admin) => {
            if (err) {
                await bot.deleteMessage(fromId, registerId);
                await bot.deleteMessage(fromId, messageId);
                console.error(err.message);
                await bot.editMessageText('Admin kalitini tekshirishda xatolik yuz berdi.', {
                    chat_id: fromId,
                    message_id: mesId,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔙Orqaga', callback_data: 'back' }]
                        ]
                    }
                });
            }
            else if (admin) {
                admin_key = false;
                result.push(text);
                await bot.deleteMessage(fromId, registerId);
                await bot.deleteMessage(fromId, messageId);
                await bot.sendMessage(fromId, 'Test kalitini kiriting:').then(messages => {
                    registerId = messages.message_id;
                });
                test_key = true;
            } else {
                await bot.deleteMessage(fromId, registerId);
                await bot.deleteMessage(fromId, messageId);
                await bot.sendMessage(fromId, 'Admin kaliti topilmadi, qayta kiriting:').then(messages => {
                    registerId = messages.message_id;
                });
            }
        })
    }
    else if (test_key) {
        db.get('select * from submissions where adminId = ? and login = ? and chatId = ?', [result[0].trim(), text, chatId], async (err, existingSubmission) => {
            if (err) {
                bot.deleteMessage(fromId, registerId);
                bot.deleteMessage(fromId, messageId);
                console.error(err.message);
                bot.editMessageText('Test kalitini tekshirishda xatolik yuz berdi.', {
                    chat_id: fromId,
                    message_id: mesId,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔙Orqaga', callback_data: 'back' }]
                        ]
                    }
                });
            }
            if (existingSubmission) {
                bot.deleteMessage(fromId, registerId);
                bot.deleteMessage(fromId, messageId);
                bot.sendMessage(fromId, `${text} kalit uchun javob yuborgansiz, tekshirib qayta yuboring:`).then(messages => {
                    registerId = messages.message_id;
                });
            } else {
                db.get('select * from answerKeys where adminId = ? and login = ?', [result[0].trim(), text], async (err, keyDoc) => {
                    if (err) {
                        bot.deleteMessage(fromId, registerId);
                        bot.deleteMessage(fromId, messageId);
                        console.error(err.message);
                        bot.editMessageText('Test kalitini tekshirishda xatolik yuz berdi.', {
                            chat_id: fromId,
                            message_id: mesId,
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '🔙Orqaga', callback_data: 'back' }]
                                ]
                            }
                        });
                    }
                    else if (keyDoc) {
                        test_key = false;
                        result.push(text);
                        bot.deleteMessage(fromId, registerId);
                        bot.deleteMessage(fromId, messageId);
                        bot.sendMessage(fromId, 'Javoblarni kiriting:').then(messages => {
                            registerId = messages.message_id;
                        });
                        natija = true;
                    } else {
                        bot.deleteMessage(fromId, registerId);
                        bot.deleteMessage(fromId, messageId);
                        bot.sendMessage(fromId, `${text} kalit topilmadi, tekshirib qayta yuboring:`).then(messages => {
                            registerId = messages.message_id;
                        });
                    }
                })
            }
        })
    }
    else if (natija) {
        natija = false;
        const adminChatId = result[0].trim();
        const login = result[1].trim();
        const userKey = text;
        let correctAnswers = null;
        let combinatsiya = null;
        db.get('select * from answerKeys where adminId = ? and login = ?', [adminChatId, login], (err, answerKey) => {
            if (err) {
                bot.deleteMessage(fromId, registerId);
                bot.deleteMessage(fromId, messageId);
                console.error('Error checking answers:', err);
                bot.editMessageText('Javoblarni tekshirishda xatolik yuz berdi.', {
                    chat_id: fromId,
                    message_id: mesId,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔙Orqaga', callback_data: 'back' }]
                        ]
                    }
                });
            }
            else {
                correctAnswers = answerKey.key.toUpperCase().split('');
                combinatsiya = answerKey.text.toUpperCase();
            }
        })

        db.all('select * from registeredUsers where chatId = ?', chatId, async (err, user) => {
            const userAnswers = userKey.toUpperCase().split('');
            let totalScore = 0;
            let resultText = '';
            if (err || !correctAnswers || !user) {
                bot.deleteMessage(fromId, registerId);
                bot.deleteMessage(fromId, messageId);
                console.error(err.message);
                bot.editMessageText('Javoblarni tekshirishda xatolik yuz berdi.', {
                    chat_id: fromId,
                    message_id: mesId,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔙Orqaga', callback_data: 'back' }]
                        ]
                    }
                });
            }
            else if (correctAnswers.length === userAnswers.length) {
                let blogDetails;
                if (combinatsiya === 'TEST') {
                    [countTest, blogDetails] = [90, '30-3.1/30-2.1/10-1.1/10-1.1/10-1.1/'];
                    resultText = '';
                    let answerIndex = 0;

                    blogDetails.split('/').forEach((element, index) => {
                        if (index < blogDetails.split('/').length - 1) {
                            const [questionCount, scorePerQuestion] = element.split('-');
                            let correctCount = 0;
                            for (let j = answerIndex; j < answerIndex + parseInt(questionCount); j++) {
                                if (j >= correctAnswers.length || j >= userAnswers.length) {
                                    break;
                                }
                                if (correctAnswers[j] === userAnswers[j]) {
                                    correctCount++;
                                }
                            }
                            const score = roundToDecimal(parseFloat(scorePerQuestion) * correctCount, 2);
                            resultText += `${index + 1}-blog: ${correctCount}/${questionCount} ta to'g'ri javob, ${score} ball.\n`;
                            totalScore += score;
                            answerIndex += parseInt(questionCount);
                        }
                    });

                    bot.deleteMessage(fromId, registerId);
                    bot.deleteMessage(fromId, messageId);
                    bot.editMessageText(`${user[0].name} test natijangiz:\n${resultText}\nUmumiy: ${roundToDecimal(totalScore, 2)} ball.`, {
                        chat_id: fromId,
                        message_id: mesId,
                    });
                    bot.sendMessage(fromId, 'Natijangiz adminga yuborildi!', {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔙Orqaga', callback_data: 'back' }]
                            ]
                        }
                    });
                } else {
                    [countTest, blogDetails] = combinatsiya.split('_');
                    resultText = '';
                    let answerIndex = 0;

                    blogDetails.split('/').forEach((element, index) => {
                        if (index < blogDetails.split('/').length - 1) {
                            const [questionCount, scorePerQuestion] = element.split('-');
                            let correctCount = 0;
                            for (let j = answerIndex; j < answerIndex + parseInt(questionCount); j++) {
                                if (j >= correctAnswers.length || j >= userAnswers.length) {
                                    break;
                                }
                                if (correctAnswers[j] === userAnswers[j]) {
                                    correctCount++;
                                }
                            }
                            const score = roundToDecimal(parseFloat(scorePerQuestion) * correctCount, 2);
                            resultText += `${index + 1}-blog: ${correctCount}/${questionCount} ta to'g'ri javob, ${score} ball.\n`;
                            totalScore += score;
                            answerIndex += parseInt(questionCount);
                        }
                    });
                    bot.deleteMessage(fromId, registerId);
                    bot.deleteMessage(fromId, messageId);
                    bot.editMessageText(`${user[0].name} test natijangiz:\n${resultText}\nUmumiy: ${roundToDecimal(totalScore, 2)} ball.`, {
                        chat_id: fromId,
                        message_id: mesId,
                    });
                    bot.sendMessage(fromId, 'Natijangiz adminga yuborildi!', {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '🔙Orqaga', callback_data: 'back' }]
                            ]
                        }
                    });
                }
                const insertDB = db.prepare('insert into submissions (name, login, result, adminId, chatId, createdAt) values (?, ?, ?, ?, ?, ?)');
                insertDB.run(user[0].name, login, roundToDecimal(totalScore, 2), adminChatId, chatId, new Date());
            } else {
                bot.deleteMessage(fromId, registerId);
                bot.deleteMessage(fromId, messageId);
                bot.editMessageText(`Siz kiritgan testlar soni javobnikiga mos kelmadi!\n\nSizning test javoblaringiz: ${userAnswers.join('')}`, {
                    chat_id: fromId,
                    message_id: mesId,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔙Orqaga', callback_data: 'back' }]
                        ]
                    }
                });
            }
        })
    }
    else if (delete_key) {
        delete_key = false;
        const login = text;

        //await db.all('select * from ')
        // Kalitni o'chirish
        //await db.run('delete from answerKeys where login = ? and adminId = ?', [login, fromId], async (err) => {
        await db.all('select * from answerKeys where login = ? and adminId = ?', [login, fromId], async (err, resultad) => {
            if (!err && resultad[0]) {
                await db.run('delete from answerKeys where login = ? and adminId = ?', [login, fromId]);
                // Topshiruvchilarning username va natijalarini olish
                await db.all('select * from submissions where login = ? and adminId = ?', [login, fromId], async (err, submissions) => {
                    if (submissions[0]) {
                        const workbook = new ExcelJS.Workbook();
                        const worksheet = workbook.addWorksheet('Data');

                        // Hujjat ustunlarini sozlash
                        worksheet.columns = [
                            { header: 'Name', key: 'name', width: 30 },
                            { header: 'Result', key: 'result', width: 10 },
                            { header: 'Date', key: 'date', width: 30 }
                        ];

                        // Submissions ma'lumotlarini qo'shish
                        submissions.forEach(item => {
                            const date = new Date(item.createdAt);

                            // Yil, oy, kun formatida olish
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0'); // Oylarda 0-dan 11-gacha bo'ladi, shuning uchun +1 qo'shamiz
                            const day = String(date.getDate()).padStart(2, '0');
                            const hours = String(date.getHours()).padStart(2, '0');
                            const minutes = String(date.getMinutes()).padStart(2, '0');
                            const seconds = String(date.getSeconds()).padStart(2, '0');
                            worksheet.addRow({
                                name: item.name,
                                result: item.result,
                                date: `${day}-${month}-${year} | ${hours}:${minutes}:${seconds}`
                            });
                        }
                        );

                        //let response = `Kalit "${login}" o'chirildi. Topshiruvchilar:\n`;
                        // submissions.forEach((submission, index) => {
                        //     const date = new Date(item.createdAt);

                        //     // Yil, oy, kun formatida olish
                        //     const year = date.getFullYear();
                        //     const month = String(date.getMonth() + 1).padStart(2, '0'); // Oylarda 0-dan 11-gacha bo'ladi, shuning uchun +1 qo'shamiz
                        //     const day = String(date.getDate()).padStart(2, '0');
                        //     const hours = String(date.getHours()).padStart(2, '0');
                        //     const minutes = String(date.getMinutes()).padStart(2, '0');
                        //     const seconds = String(date.getSeconds()).padStart(2, '0');
                        //     response += `${index + 1}. ${submission.name} - ${submission.result} ball |${submission.createdAt.toISOString()}|\n`;
                        // });
                        bot.deleteMessage(fromId, registerId);
                        bot.deleteMessage(fromId, messageId);
                        // bot.editMessageText(response, {
                        //     chat_id: fromId,
                        //     message_id: mesId,
                        //     reply_markup: {
                        //         inline_keyboard: [
                        //             [{ text: '🔙Orqaga', callback_data: 'admin' }]
                        //         ]
                        //     }
                        // })
                        const filePath = path.join(__dirname, `Test-${login}_${(new Date()).getFullYear()}-${(new Date()).getMonth() + 1}-${(new Date()).getDate()}.xlsx`);
                        await workbook.xlsx.writeFile(filePath);

                        // Faylni yuborish
                        bot.sendDocument(fromId, filePath).then(() => {
                            // Fayl yuborilgandan so'ng o'chirish
                            fs.unlink(filePath, (err) => {
                                if (err) {
                                    console.error('Faylni o\'chirishda xatolik:', err);
                                } else {
                                    console.log('Fayl muvaffaqiyatli o\'chirildi.');
                                    bot.deleteMessage(fromId, mesId);
                                    bot.sendMessage(fromId, 'Test yakunlandi!', {
                                        reply_markup: {
                                            inline_keyboard: [
                                                [{ text: '🔙Orqaga', callback_data: 'admin' }]
                                            ]
                                        }
                                    })
                                }
                            });
                        }).catch(error => {
                            console.error('Faylni yuborishda xatolik:', error);
                        });

                        await db.run('delete from submissions where login = ? and adminId = ?', [login, fromId]);
                    } else {
                        bot.deleteMessage(fromId, registerId);
                        bot.deleteMessage(fromId, messageId);
                        bot.editMessageText(`Kalit "${login}" o'chirildi, ammo topshiruvchilar topilmadi.`, {
                            chat_id: fromId,
                            message_id: mesId,
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: '🔙Orqaga', callback_data: 'admin' }]
                                ]
                            }
                        })
                    }
                })
            } else {
                bot.deleteMessage(fromId, registerId);
                bot.deleteMessage(fromId, messageId);
                bot.editMessageText(`Kalit "${login}" topilmadi.`, {
                    chat_id: fromId,
                    message_id: mesId,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🔙Orqaga', callback_data: 'admin' }]
                        ]
                    }
                })
            }
        })
    } else {
        bot.deleteMessage(fromId, messageId);
    }
});

function roundToDecimal(num, decimalPlaces) {
    var factor = Math.pow(10, decimalPlaces);
    return Math.round(num * factor) / factor;
}
