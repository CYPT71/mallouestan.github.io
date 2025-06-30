const cn = window.customNotes;


async function exportJson() {
    return JSON.stringify(await Promise.all((await window.customNotes.storage.getAllNotes()).map(n => n.json())))
}

/**
 * 
 * @param {string} notes 
 */
async function importJson(notesString) {
    /**
     * @type {object}
     */
    JSON.parse(notesString).forEach(async (note) => {
        const pageNotes = await Promise.all(
        (
            await cn.storage.getNotesByPath(note.pagePathname)
        ).map((file) => file.json())
        );

        cn.manageNoteSaving(note, pageNotes)
    })
}


cn.tryExport.exportJson = exportJson
cn.tryExport.importJson = importJson