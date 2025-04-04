const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const inventory = require("./src/inventory");
const db = require("./src/db");

let mainWindow;
let cachedProducts = null; // For product list caching

ipcMain.on("focus-fix", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.blur(); // First remove focus
    win.focus(); // Then force focus back
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true, // Essential security
      enableRemoteModule: false,
      sandbox: true, // Additional security
      nodeIntegration: false, // Disabled for security
    },
  });

  mainWindow.loadFile("index.html");

  // Cleanup when window closes
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // IPC Handlers with error handling
  ipcMain.handle("get-all-products", async () => {
    try {
      if (!cachedProducts) {
        cachedProducts = await inventory.getAllProducts();
      }
      return cachedProducts;
    } catch (error) {
      console.error("Product fetch error:", error);
      return []; // Return empty array instead of failing
    }
  });

  ipcMain.handle("upsert-product", async (event, product) => {
    try {
      cachedProducts = null; // Invalidate cache on update
      return await inventory.upsertProduct(product);
    } catch (error) {
      console.error("Product save error:", error);
      throw new Error(`Failed to save product: ${error.message}`);
    }
  });

  ipcMain.handle("delete-product", async (event, id) => {
    try {
      cachedProducts = null; // Invalidate cache on delete
      return await inventory.deleteProduct(id);
    } catch (error) {
      console.error("Product delete error:", error);
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  });

  ipcMain.handle("get-statistics", async () => {
    try {
      const products = db
        .prepare(
          `
        SELECT *
        FROM products
      `
        )
        .all();

      const totalProfit = products.reduce((sum, p) => sum + p.net_profit, 0);

      console.log(products);

      return {
        totalProfit,
        products: products.map((p) => ({
          name: p.name,
          total_sold: p.total_sold,
          avg_buying_price: p.avg_buying_price, // Using cost_price directly
          avg_selling_price: p.selling_price,
          net_profit: p.net_profit, // Using dynamically calculated profit
        })),
      };
    } catch (error) {
      console.error("Statistics error:", error);
      return { totalProfit: 0, products: [] };
    }
  });

  ipcMain.handle("get-logs", async (event, dateFilter) => {
    try {
      let query = `
        SELECT l.*, p.name as product_name 
        FROM inventory_logs l
        JOIN products p ON l.product_id = p.id
      `;
      const params = [];

      if (dateFilter === "today") {
        query += ` WHERE date(l.changed_at) = date('now')`;
      } else if (dateFilter) {
        query += ` WHERE date(l.changed_at) = date(?)`;
        params.push(dateFilter);
      }

      query += ` ORDER BY l.changed_at DESC`;
      return db.prepare(query).all(...params);
    } catch (error) {
      console.error("Logs fetch error:", error);
      return [];
    }
  });

  ipcMain.handle("get-todays-product", async (event, productId) => {
    try {
      return await inventory.getTodaysProductSales(productId);
    } catch (error) {
      console.error("Get today's product error:", error);
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  });

  // sell and add stock functionality should be added
  ipcMain.handle(
    "add-stock",
    async (event, productId, quantity, newBuyingPrice) => {
      try {
        cachedProducts = null; // Invalidate cache on update
        return await inventory.addStock(productId, quantity, newBuyingPrice);
      } catch (error) {
        console.error("Add stock error:", error);
        throw new Error(`Failed to add stock: ${error.message}`);
      }
    }
  );

  ipcMain.handle(
    "sell-stock",
    async (event, productId, quantity, discountedPrice) => {
      try {
        cachedProducts = null; // Invalidate cache on update
        return await inventory.sellStock(productId, quantity, discountedPrice);
      } catch (error) {
        console.error("Sell stock error:", error);
        throw new Error(`Failed to sell stock: ${error.message}`);
      }
    }
  );
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});
