// DOM Elements
const productListBody = document.getElementById("productListBody");
const addProductBtn = document.getElementById("addProductBtn");
const productModal = document.getElementById("productModal");
const stockModal = document.getElementById("stockModal");
const sellModal = document.getElementById("sellModal");
const closeButtons = document.querySelectorAll(".close");

// Current product being edited
let currentProduct = null;

// Load products when page loads
document.addEventListener("DOMContentLoaded", loadProducts);
switchPage("dashboard");

// Modal open/close handlers
addProductBtn.addEventListener("click", () => {
  currentProduct = null;
  document.getElementById("modalTitle").textContent = "Add New Product";
  document.getElementById("productForm").reset();
  productModal.style.display = "block";
});

closeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    productModal.style.display = "none";
    stockModal.style.display = "none";
    sellModal.style.display = "none";
  });
});

window.addEventListener("click", (event) => {
  if (
    event.target === productModal ||
    event.target === stockModal ||
    event.target === sellModal
  ) {
    productModal.style.display = "none";
    stockModal.style.display = "none";
    sellModal.style.display = "none";
  }
});

// Product form submission
document.getElementById("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const productData = {
    name: document.getElementById("name").value,
    remark: document.getElementById("remarks").value || null,
    buying_price: parseFloat(document.getElementById("buyingPrice").value),
    selling_price: parseFloat(document.getElementById("sellingPrice").value),
    quantity: parseInt(document.getElementById("quantity").value),
    avg_buying_price: parseFloat(document.getElementById("buyingPrice").value),
  };

  if (currentProduct) {
    productData.id = currentProduct.id;
  }

  try {
    await window.inventoryAPI.upsertProduct(productData);
    loadProducts();
    productModal.style.display = "none";
  } catch (err) {
    console.error("Error saving product:", err);
    alert("Error saving product");
  }
});

// Stock form submission
document.getElementById("stockForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const stockData = {
    productId: parseInt(document.getElementById("stockProductId").value),
    quantity: parseInt(document.getElementById("addQuantity").value),
    price: parseFloat(document.getElementById("addPrice").value),
  };

  try {
    await window.inventoryAPI.addStock(
      stockData.productId,
      stockData.quantity,
      stockData.price
    );
    loadProducts();
    stockModal.style.display = "none";
  } catch (err) {
    console.error("Error adding stock:", err);
    alert("Error adding stock");
  }
});

// Sell form submission
document.getElementById("sellForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const sellData = {
    productId: parseInt(document.getElementById("sellProductId").value),
    quantity: parseInt(document.getElementById("sellQuantity").value),
  };

  try {
    await window.inventoryAPI.sellStock(sellData.productId, sellData.quantity);
    loadProducts();
    sellModal.style.display = "none";
  } catch (err) {
    console.error("Error selling product:", err);
    alert(err.message);
  }
});

// Load products from database
async function loadProducts() {
  try {
    const products = await window.inventoryAPI.getAllProducts();
    productListBody.innerHTML = "";

    if (products.length === 0) {
      productListBody.innerHTML =
        '<tr><td colspan="7" style="text-align: center;">No products found</td></tr>';
      return;
    }

    products.forEach(async (product) => {
      const row = document.createElement("tr");
      console.log(product);
      const todaysProduct = await window.inventoryAPI.getTodaysProduct(
        product.id
      );
      console.log(todaysProduct);

      row.innerHTML = `
                <td>${product.name}</td>
                <td>${product.quantity}</td>
                <td>$${product.buying_price?.toFixed(2)}</td>
                <td>$${product.selling_price?.toFixed(2)}</td>
                <td>$${todaysProduct.total_profit?.toFixed(2)}</td>
                <td>${todaysProduct.sales_count}</td>
                <td>
                    <button class="btn stock-btn" data-id="${
                      product.id
                    }">Add Stock</button>
                    <button class="btn sell-btn" data-id="${
                      product.id
                    }">Sell</button>
                    <button class="btn delete-btn" data-id="${
                      product.id
                    }">Delete</button>
                </td>
            `;

      productListBody.appendChild(row);
    });

    /*
    // Add event listeners to action buttons
    document.querySelectorAll(".stock-btn").forEach((btn) => {
      console.log(btn);
      btn.addEventListener("click", (e) => {
        const productId = parseInt(e.target.getAttribute("data-id"));
        console.log(productId);
        document.getElementById("stockProductId").value = productId;
        document.getElementById("stockForm").reset();
        stockModal.style.display = "block";
      });
    });

    document.querySelectorAll(".sell-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const productId = parseInt(e.target.getAttribute("data-id"));
        document.getElementById("sellProductId").value = productId;
        document.getElementById("sellForm").reset();
        sellModal.style.display = "block";
      });
    });

    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const productId = parseInt(e.target.getAttribute("data-id"));
        console.log(productId);
        if (confirm("Are you sure you want to delete this product?")) {
          try {
            await window.inventoryAPI.deleteProduct(productId);
            loadProducts();
          } catch (err) {
            console.error("Error deleting product:", err);
            alert("Error deleting product");
          }
        }
      });
    });
    */
    productListBody.addEventListener("click", async (e) => {
      const stockBtn = e.target.closest(".stock-btn");
      const sellBtn = e.target.closest(".sell-btn");
      const deleteBtn = e.target.closest(".delete-btn");

      if (stockBtn) {
        const productId = parseInt(stockBtn.getAttribute("data-id"));
        document.getElementById("stockProductId").value = productId;
        document.getElementById("stockForm").reset();
        stockModal.style.display = "block";
      }

      if (sellBtn) {
        const productId = parseInt(sellBtn.getAttribute("data-id"));
        document.getElementById("sellProductId").value = productId;
        document.getElementById("sellForm").reset();
        sellModal.style.display = "block";
      }

      if (deleteBtn) {
        const productId = parseInt(deleteBtn.getAttribute("data-id"));
        if (confirm("Are you sure you want to delete this product?")) {
          try {
            await window.inventoryAPI.deleteProduct(productId);
            loadProducts();
          } catch (err) {
            console.error("Error deleting product:", err);
            alert("Error deleting product");
          }
        }
      }
    });
  } catch (err) {
    console.error("Error loading products:", err);
    alert("Error loading products");
  }
}

async function loadStatistics() {
  try {
    const stats = await window.inventoryAPI.getStatistics();

    // Update summary cards
    document.getElementById(
      "totalProfit"
    ).textContent = `$${stats.totalProfit.toFixed(2)}`;

    // Populate product stats table
    const table = document.getElementById("productStatsTable");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Product</th>
          <th>Sold</th>
          <th>Avg Buy</th>
          <th>Avg Sell</th>
          <th>Profit</th>
        </tr>
      </thead>
      <tbody>
        ${stats.products
          .map(
            (p) => `
          <tr>
            <td>${p.name}</td>
            <td>${p.total_sold}</td>
            <td>$${p.avg_buying_price?.toFixed(2)}</td>
            <td>$${p.net_profit?.toFixed(2)}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    `;
  } catch (err) {
    console.error("Error loading statistics:", err);
  }
}

async function loadLogs(dateFilter = null) {
  try {
    const logs = await window.inventoryAPI.getLogs(dateFilter);

    const table = document.getElementById("logsTable");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Time</th>
          <th>Product</th>
          <th>Action</th>
          <th>Qty Change</th>
          <th>Price Change</th>
        </tr>
      </thead>
      <tbody>
        ${logs
          .map(
            (log) => `
          <tr>
            <td>${new Date(log.changed_at).toLocaleString()}</td>
            <td>${log.product_name}</td>
            <td>${log.action}</td>
            <td>${log.quantity_change}</td>
            <td>${
              log.price_change ? "$" + log.price_change.toFixed(2) : "-"
            }</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    `;
  } catch (err) {
    console.error("Error loading logs:", err);
  }
}

// Navigation controls
document.getElementById("dashboardBtn").addEventListener("click", () => {
  switchPage("dashboard");
});

document.getElementById("statsBtn").addEventListener("click", () => {
  switchPage("stats");
  loadStatistics();
});

document.getElementById("logsBtn").addEventListener("click", () => {
  switchPage("logs");
  loadLogs("today");
});

// Date filter for logs
document.getElementById("logDateFilter").addEventListener("change", (e) => {
  loadLogs(e.target.value);
});

document.getElementById("todayLogsBtn").addEventListener("click", () => {
  loadLogs("today");
});

document.getElementById("allLogsBtn").addEventListener("click", () => {
  loadLogs(null);
});

function switchPage(pageName) {
  // Hide all pages
  document.querySelectorAll(".page").forEach((p) => {
    p.classList.remove("active");
  });

  document.getElementById(`${pageName}Page`).classList.add("active");

  // Update nav buttons
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.getElementById(`${pageName}Btn`).classList.add("active");
}
