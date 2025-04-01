const db = require("./db");

const inventory = {
  // Add or update a product
  upsertProduct(product) {
    const {
      name,
      quantity,
      buying_price,
      selling_price,
      discounted_price,
      avg_buying_price,
      remark,
    } = product;

    // Check if product exists
    const existing = db
      .prepare(
        `
      SELECT id, quantity FROM products 
      WHERE name = ?
        `
      )
      .get(name);

    if (existing) {
      // Update existing product
      const stmt = db.prepare(`
        UPDATE products 
        SET
          quantity = ?,
          buying_price = ?,
          selling_price = ?,
          discounted_price = ?,
          avg_bying_price = ?,
          remark = ?,
          last_updated = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(
        quantity,
        buying_price,
        selling_price,
        discounted_price,
        remark,
        avg_buying_price,
        existing.id
      );

      // Log the update
      this.logTransaction({
        product_id: existing.id,
        action: "UPDATE",
        old_quantity: existing.quantity,
        new_quantity: quantity,
      });

      return { action: "UPDATED", id: existing.id };
    } else {
      // Insert new product
      const stmt = db.prepare(`
        INSERT INTO products (
          name, quantity, 
          buying_price, selling_price, discounted_price, remark,
          avg_buying_price
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        name,
        quantity,
        buying_price,
        selling_price,
        discounted_price || null,
        remark || null,
        avg_buying_price || 0
      );

      // Log the addition
      this.logTransaction({
        product_id: result.lastInsertRowid,
        action: "ADD",
        old_quantity: 0,
        new_quantity: quantity,
      });

      return { action: "ADDED", id: result.lastInsertRowid };
    }
  },

  // Delete a product
  deleteProduct(productId) {
    // Get product before deletion for logging
    const product = db
      .prepare("SELECT id, quantity FROM products WHERE id = ?")
      .get(productId);

    if (!product) return false;

    // Delete the product
    db.prepare("DELETE FROM products WHERE id = ?").run(productId);

    // Log the deletion
    /*
    this.logTransaction({
      product_id: productId,
      action: "DELETE",
      old_quantity: product.quantity,
      new_quantity: 0,
    });
    */

    return true;
  },

  // Get all products
  getAllProducts() {
    console.log("get ALL products\n");
    return db.prepare("SELECT * FROM products ORDER BY name").all();
  },

  // Log transactions
  logTransaction(log) {
    db.prepare(
      `
      INSERT INTO inventory_logs (
        product_id, action, old_quantity, new_quantity
      ) VALUES (?, ?, ?, ?)
    `
    ).run(log.product_id, log.action, log.old_quantity, log.new_quantity);
  },

  // Add stock to existing product
  addStock(productId, quantity, newBuyingPrice) {
    const product = db
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(productId);

    // Calculate new average buying price
    const totalCost =
      product.quantity * product.avg_buying_price + quantity * newBuyingPrice;
    const newAvgPrice = totalCost / (product.quantity + quantity);

    // Update product
    db.prepare(
      `
      UPDATE products 
      SET 
        quantity = quantity + ?,
        buying_price = ?,
        avg_buying_price = ?,
        last_updated = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    ).run(quantity, newBuyingPrice, newAvgPrice, productId);

    // Log transaction
    this.logTransaction({
      product_id: productId,
      action: "STOCK_ADD",
      quantity_change: quantity,
      price_change: newBuyingPrice,
      previous_avg_price: product.avg_buying_price,
      new_avg_price: newAvgPrice,
    });
  },

  // Sell product
  sellStock(productId, quantity, discountedPrice) {
    const product = db
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(productId);

    if (product.quantity < quantity) {
      throw new Error("Insufficient stock");
    }

    // Calculate profit
    const profit =
      (product.selling_price - product.avg_buying_price) * quantity -
      discountedPrice;

    // Update product
    db.prepare(
      `
      UPDATE products 
      SET 
        quantity = quantity - ?,
        total_sold = total_sold + ?,
        net_profit = net_profit + ?,
        last_updated = CURRENT_TIMESTAMP
      WHERE id = ?
      `
    ).run(quantity, quantity, profit, productId);

    // calculate today's sales
    const todaysProfit =
      (product.selling_price - product.buying_price) * quantity -
      discountedPrice;
    this.recordProductSale(productId, todaysProfit, quantity);

    // Log transaction
    this.logTransaction({
      product_id: productId,
      action: "STOCK_SELL",
      quantity_change: -quantity,
      price_change: product.selling_price,
    });
  },

  // Get recent logs (for demo)
  getRecentLogs(limit = 10) {
    return db
      .prepare(
        `
      SELECT l.*, p.name 
      FROM inventory_logs l
      JOIN products p ON l.product_id = p.id
      ORDER BY l.changed_at DESC
      LIMIT ?
    `
      )
      .all(limit);
  },

  // daily table
  recordProductSale(productId, totalProfit, quantity) {
    const today = new Date().toISOString().split("T")[0];

    const result = db
      .prepare(
        `
      INSERT INTO product_daily_sales (date, product_id, sales_count, total_profit) 
      VALUES (?, ?, ?, ?)
      ON CONFLICT(date, product_id) DO UPDATE SET 
        sales_count = sales_count + excluded.sales_count,
        total_profit = total_profit + excluded.total_profit
      RETURNING sales_count, total_profit
        `
      )
      .get(today, productId, quantity, totalProfit);

    return result;
  },

  //get product sell
  getTodaysProductSales(productId) {
    const today = new Date().toISOString().split("T")[0];

    const result = db
      .prepare(
        `
      SELECT sales_count, total_profit 
      FROM product_daily_sales 
      WHERE date = ? AND product_id = ?
      `
      )
      .get(today, productId);

    return result || { sales_count: 0, total_profit: 0 };
  },
};

module.exports = inventory;
