// Admin panel functionality

/**
 * Toggle visibility of an element
 * @param {string} elementId - ID of element to toggle
 */
function toggleElement(elementId) {
  const element = document.getElementById(elementId);
  if (element.classList.contains('hidden')) {
    element.classList.remove('hidden');
  } else {
    element.classList.add('hidden');
  }
}

/**
 * Initialize data tables with search functionality
 * @param {string} tableId - ID of table element
 * @param {string} searchId - ID of search input element
 * @param {number} columnIndex - Index of column to search (0-based)
 */
function initializeDataTable(tableId, searchId, columnIndex = 1) {
  const searchInput = document.getElementById(searchId);
  const table = document.getElementById(tableId);
  
  if (!searchInput || !table) return;
  
  const tableRows = table.querySelectorAll('tbody tr');
  
  searchInput.addEventListener('keyup', function() {
    const searchTerm = this.value.toLowerCase();
    
    tableRows.forEach(row => {
      const cellText = row.cells[columnIndex].textContent.toLowerCase();
      
      if (cellText.includes(searchTerm)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  });
}

/**
 * Confirm action with dialog
 * @param {string} message - Confirmation message
 * @returns {boolean} True if confirmed, false otherwise
 */
function confirmAction(message = 'Apakah Anda yakin?') {
  return confirm(message);
}

/**
 * Format date to Indonesian format
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
  if (!date) return '';
  
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return new Date(date).toLocaleDateString('id-ID', options);
}

/**
 * Initialize modal functionality
 * @param {string} modalId - ID of modal element
 * @param {string} openBtnId - ID of button to open modal
 * @param {string} closeBtnId - ID of button to close modal
 */
function initializeModal(modalId, openBtnId, closeBtnId) {
  const modal = document.getElementById(modalId);
  const openBtn = document.getElementById(openBtnId);
  const closeBtn = document.getElementById(closeBtnId);
  
  if (!modal || !openBtn || !closeBtn) return;
  
  openBtn.addEventListener('click', function() {
    modal.classList.remove('hidden');
  });
  
  closeBtn.addEventListener('click', function() {
    modal.classList.add('hidden');
  });
  
  // Close modal when clicking outside
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize data tables if they exist
  if (document.getElementById('usersTable') && document.getElementById('searchInput')) {
    initializeDataTable('usersTable', 'searchInput');
  }
});