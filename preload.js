const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("inventoryAPI", {
  getAllProducts: () => ipcRenderer.invoke("get-all-products"),
  upsertProduct: (product) => ipcRenderer.invoke("upsert-product", product),
  deleteProduct: (id) => ipcRenderer.invoke("delete-product", id),
  getStatistics: () => ipcRenderer.invoke("get-statistics"),
  getLogs: (dateFilter) => ipcRenderer.invoke("get-logs", dateFilter),
  getTodaysProduct: (productId) =>
    ipcRenderer.invoke("get-todays-product", productId),
  addStock: (productId, quantity, newBuyingPrice) =>
    ipcRenderer.invoke("add-stock", productId, quantity, newBuyingPrice),
  sellStock: (productId, quantity, discountedPrice) =>
    ipcRenderer.invoke("sell-stock", productId, quantity, discountedPrice),
});
