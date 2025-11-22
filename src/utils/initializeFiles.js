// Initialize file system with existing JSON data
// This ensures that existing files are available in localStorage

export const initializeFiles = async () => {
  try {
    // Initialize courses
    const coursKey = 'encg_cours_files';
    if (!localStorage.getItem(coursKey)) {
      try {
        const response = await fetch('/cours/index.json');
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem(coursKey, JSON.stringify(data));
        }
      } catch (error) {
        localStorage.setItem(coursKey, JSON.stringify([]));
      }
    }

    // Initialize TDs
    const tdKey = 'encg_td_files';
    if (!localStorage.getItem(tdKey)) {
      try {
        const response = await fetch('/td/index.json');
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem(tdKey, JSON.stringify(data));
        }
      } catch (error) {
        localStorage.setItem(tdKey, JSON.stringify([]));
      }
    }
  } catch (error) {
    // Silently handle initialization errors
  }
};
