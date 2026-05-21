import SwiftData
import SwiftUI

struct PromptEditorView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \PromptTemplate.order) private var prompts: [PromptTemplate]
    @State private var newPrompt = ""

    var body: some View {
        Form {
            Section("Daily prompts") {
                ForEach(prompts) { prompt in
                    PromptTemplateRow(prompt: prompt)
                }
                .onDelete(perform: delete)
            }

            Section("Add prompt") {
                TextField("Prompt", text: $newPrompt, axis: .vertical)
                Button {
                    addPrompt()
                } label: {
                    Label("Add", systemImage: "plus")
                }
                .disabled(newPrompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .navigationTitle("Prompts")
    }

    private func addPrompt() {
        let trimmed = newPrompt.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let prompt = PromptTemplate(title: "Custom", prompt: trimmed, order: (prompts.map(\.order).max() ?? 0) + 1)
        modelContext.insert(prompt)
        try? modelContext.save()
        newPrompt = ""
    }

    private func delete(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(prompts[index])
        }
        try? modelContext.save()
    }
}

private struct PromptTemplateRow: View {
    @Bindable var prompt: PromptTemplate

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            TextField("Title", text: $prompt.title)
                .font(.headline)
            TextField("Prompt", text: $prompt.prompt, axis: .vertical)
                .lineLimit(2...5)
            Toggle("Enabled", isOn: $prompt.isEnabled)
        }
    }
}
