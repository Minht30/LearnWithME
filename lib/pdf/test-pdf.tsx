import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { DbTest, DbQuestion } from "@/lib/db/types";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    padding: 48,
    lineHeight: 1.5,
    color: "#111",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    paddingBottom: 6,
    marginBottom: 18,
  },
  brand: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 9, color: "#555" },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
    marginBottom: 4,
  },
  subtitle: { fontSize: 10, color: "#555", marginBottom: 18 },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
    fontSize: 10,
  },
  nameField: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  underline: {
    borderBottomWidth: 1,
    borderBottomColor: "#999",
    minWidth: 160,
    height: 12,
    marginLeft: 6,
  },
  q: { marginBottom: 20 },
  qHeader: { flexDirection: "row", gap: 8, marginBottom: 6 },
  qNum: { fontFamily: "Helvetica-Bold", width: 22 },
  qPrompt: { flex: 1 },
  choicesGrid: {
    marginTop: 6,
    marginLeft: 22,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  choice: {
    width: "50%",
    flexDirection: "row",
    marginBottom: 4,
    paddingRight: 12,
  },
  choiceLetter: { fontFamily: "Helvetica-Bold", width: 14 },
  workspace: {
    marginLeft: 22,
    marginTop: 4,
    height: 60,
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
  },
  workspaceShort: {
    marginLeft: 22,
    marginTop: 4,
    height: 24,
    borderBottomWidth: 0.5,
    borderBottomColor: "#999",
  },
  answerKey: {
    marginTop: 8,
    marginLeft: 22,
    padding: 6,
    backgroundColor: "#eef7ee",
    fontSize: 9,
  },
  keyLabel: { fontFamily: "Helvetica-Bold", color: "#166534" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#999",
  },
});

export function TestPdf({
  test,
  questions,
  withKey,
}: {
  test: DbTest;
  questions: DbQuestion[];
  withKey: boolean;
}) {
  return (
    <Document
      title={test.title}
      author="LearnWithMe"
      subject={`${test.subject} · Grade ${test.grade}`}
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow} fixed>
          <Text style={styles.brand}>LearnWithMe</Text>
          <Text style={styles.meta}>
            {test.subject} · Grade {test.grade} · {test.duration_min} min
            {withKey ? " · TEACHER COPY (answer key)" : ""}
          </Text>
        </View>

        <Text style={styles.title}>{test.title}</Text>
        <Text style={styles.subtitle}>{questions.length} questions · {test.duration_min} minutes</Text>

        {!withKey && (
          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <Text>Name:</Text>
              <View style={styles.underline} />
            </View>
            <View style={styles.nameField}>
              <Text>Date:</Text>
              <View style={styles.underline} />
            </View>
          </View>
        )}

        {questions.map((q, i) => (
          <View key={q.id} style={styles.q} wrap={false}>
            <View style={styles.qHeader}>
              <Text style={styles.qNum}>{i + 1}.</Text>
              <Text style={styles.qPrompt}>{q.prompt}</Text>
            </View>

            {q.type === "mcq" && q.choices && (
              <View style={styles.choicesGrid}>
                {q.choices.map((c, ci) => (
                  <View key={ci} style={styles.choice}>
                    <Text style={styles.choiceLetter}>{String.fromCharCode(65 + ci)}.</Text>
                    <Text>{c}</Text>
                  </View>
                ))}
              </View>
            )}

            {q.type === "short" && <View style={styles.workspaceShort} />}
            {q.type === "numeric" && <View style={styles.workspaceShort} />}
            {q.type === "long" && (
              <>
                <View style={styles.workspace} />
                <View style={styles.workspace} />
              </>
            )}

            {withKey && (
              <View style={styles.answerKey}>
                <Text>
                  <Text style={styles.keyLabel}>Answer: </Text>
                  {Array.isArray(q.correct) ? q.correct.join(", ") : String(q.correct)}
                </Text>
                {q.rubric && <Text style={{ marginTop: 2 }}>Rubric: {q.rubric}</Text>}
              </View>
            )}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>learnwithme · print-ready</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
