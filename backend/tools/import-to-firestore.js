/*
Script to import local JSON data into Firestore using the new repository layer.
Run from backend folder: `node tools/import-to-firestore.js`
Requires USE_FIRESTORE=true and Firebase env vars set in environment.
*/

const path = require('path');
const fs = require('fs');

const usersRepo = require('../repositories/usersRepository');
const productsRepo = require('../repositories/productsRepository');
const ordersRepo = require('../repositories/ordersRepository');
const messagesRepo = require('../repositories/messagesRepository');
const activityRepo = require('../repositories/activityRepository');
const otpsRepo = require('../repositories/otpsRepository');
const notificationsRepo = require('../repositories/notificationsRepository');

const DATA_DIR = path.join(__dirname, '..', 'data');

function load(file) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8') || '[]'); } catch(e) { return []; }
}

(async function(){
  try {
    const users = load('users.json');
    const products = load('products.json');
    const orders = load('orders.json');
    const messages = load('messages.json');
    const activity = load('activityLogs.json');
    const otps = load('otps.json');
    const notifications = load('notifications.json');

    console.log('Importing users:', users.length);
    await usersRepo.setAllUsers(users);
    console.log('Importing products:', products.length);
    await productsRepo.setAllProducts(products);
    console.log('Importing orders:', orders.length);
    await ordersRepo.setAllOrders(orders);
    console.log('Importing messages:', messages.length);
    await messagesRepo.setAllMessages(messages.map(m => ({ ...m, timestamp: m.timestamp || new Date().toISOString() })));
    console.log('Importing activity:', activity.length);
    await activityRepo.setAllActivityLogs(activity);
    console.log('Importing otps:', otps.length);
    await otpsRepo.setAllOtps(otps);
    console.log('Importing notifications:', notifications.length);
    await notificationsRepo.setAllNotifications(notifications);

    console.log('Import complete');
  } catch (e) {
    console.error('Import failed', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
