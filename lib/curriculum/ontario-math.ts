/**
 * Ontario Mathematics curriculum · Grades 1–8, five strands.
 * Source: https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics
 *
 * Two shapes per grade:
 *  - `strands`: high-level strand descriptors (used as anchor phrases for AI generation)
 *  - `skills`:  IXL-style granular sub-skills the model can pick and target
 */

export type OntarioMathGrade = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

type GradeEntry = {
  strands: readonly string[];
  skills: readonly string[];
};

const grades: Record<OntarioMathGrade, GradeEntry> = {
  "1": {
    strands: [
      "Number: counting to 50, place value to tens, addition & subtraction to 20",
      "Algebra: repeating patterns, equality with =",
      "Data: simple concrete graphs, sorting",
      "Spatial: comparing lengths, 2D shapes, simple 3D solids",
      "Financial literacy: recognizing Canadian coins",
    ],
    skills: [
      "Count objects up to 20",
      "Count forward and backward within 50",
      "Skip-count by 2s, 5s, and 10s to 50",
      "Represent numbers to 50 with tens and ones",
      "Compare numbers with more / less / same",
      "Add within 20 using pictures or number lines",
      "Subtract within 20",
      "Identify the missing number in a simple pattern",
      "Solve simple word problems with addition or subtraction to 20",
      "Name coins: penny, nickel, dime, quarter",
      "Sort 2D shapes by number of sides",
      "Compare lengths using non-standard units",
    ],
  },
  "2": {
    strands: [
      "Number: counting to 200, place value to hundreds, addition & subtraction to 100, halves & fourths",
      "Algebra: growing patterns, unknown in an equation",
      "Data: bar graphs, mode",
      "Spatial: measuring with cm, geometric attributes of 2D shapes",
      "Financial literacy: coin combinations to $2",
    ],
    skills: [
      "Count to 200 by 1s, 2s, 5s, 10s, and 25s",
      "Convert to/from a number: tens and ones",
      "Write numbers to 200 in expanded form",
      "Compare and order numbers up to 200",
      "Add two two-digit numbers within 100",
      "Subtract within 100",
      "Solve addition word problems with regrouping",
      "Identify halves and fourths of a whole",
      "Continue a growing number pattern",
      "Read a bar graph and answer questions",
      "Measure objects in centimetres",
      "Tell time to the nearest quarter hour",
      "Make coin combinations up to $2",
    ],
  },
  "3": {
    strands: [
      "Number: whole numbers to 1000, multiplication & division facts to 5×5, fractions of a whole",
      "Algebra: patterns in tables, order of operations with + and −",
      "Data: pictographs with many-to-one, mean of small sets",
      "Spatial: perimeter, area with grid units, angles as turns",
      "Financial literacy: making change from $10",
    ],
    skills: [
      "Count and write numbers to 1000",
      "Place value: hundreds, tens, ones",
      "Add three-digit numbers with regrouping",
      "Subtract three-digit numbers",
      "Multiplication facts through 5 × 5",
      "Division facts related to 5 × 5 multiplication",
      "Solve one-step multiplication or division word problems",
      "Identify simple fractions (1/2, 1/3, 1/4, 1/8) of a shape",
      "Measure perimeter of a rectangle in cm",
      "Estimate area by counting square units",
      "Read a pictograph with many-to-one correspondence",
      "Make change from $10 for a whole-dollar purchase",
    ],
  },
  "4": {
    strands: [
      "Number: whole numbers to 10 000, multiplication facts to 10×10, division with remainders, decimal tenths, equivalent fractions",
      "Algebra: patterns using variables, one-step equations",
      "Data: line graphs, range and median",
      "Spatial: area of rectangles, angle measurement in degrees",
      "Financial literacy: value of money and simple purchases",
    ],
    skills: [
      "Read, write, and compare numbers up to 10 000",
      "Multiplication facts through 10 × 10",
      "Divide two-digit numbers by one-digit numbers with remainders",
      "Multiply two-digit by one-digit numbers",
      "Solve multi-step word problems with + − × ÷",
      "Identify equivalent fractions with pictures",
      "Read and compare decimal tenths (0.1 – 0.9)",
      "Round numbers to the nearest ten or hundred",
      "Solve a one-step equation with a missing number",
      "Measure and classify angles (acute, right, obtuse)",
      "Calculate the area of a rectangle in cm²",
      "Read a line graph and describe a trend",
    ],
  },
  "5": {
    strands: [
      "Number: whole numbers to 100 000, multi-digit multiplication and division, decimal hundredths, mixed numbers, percents as parts of 100",
      "Algebra: two-step equations, growing & shrinking patterns",
      "Data: double bar graphs, mean/median/mode",
      "Spatial: area of triangles, volume with cubes, coordinate grid quadrant 1",
      "Financial literacy: budgeting simple items, unit price",
    ],
    skills: [
      "Read, write, and compare numbers up to 100 000",
      "Multiply three-digit by two-digit numbers",
      "Divide four-digit numbers by one-digit numbers",
      "Convert between improper fractions and mixed numbers",
      "Add and subtract fractions with like denominators",
      "Read and round decimals to the nearest hundredth",
      "Convert between decimals, fractions, and percents (0–100)",
      "Solve a two-step equation with a missing number",
      "Calculate the mean, median, and mode of a small data set",
      "Find the area of a triangle",
      "Plot ordered pairs in the first quadrant of a coordinate grid",
      "Compare unit prices to choose the best value",
    ],
  },
  "6": {
    strands: [
      "Number: integers, decimals to thousandths, ratios and rates, percent of a whole number",
      "Algebra: expressions and equations with one variable, order of operations with brackets",
      "Data: circle graphs, misleading graphs",
      "Spatial: transformations, area of parallelograms and trapezoids, nets of 3D solids",
      "Financial literacy: interest, credit vs debit basics",
    ],
    skills: [
      "Compare and order positive and negative integers",
      "Add and subtract integers using a number line",
      "Simplify ratios and solve for a missing term in a proportion",
      "Find a percent of a whole number",
      "Add and subtract fractions with unlike denominators",
      "Multiply and divide decimals to thousandths",
      "Evaluate expressions using order of operations with brackets",
      "Solve one-step equations with integers",
      "Interpret a circle graph and calculate quantities from percents",
      "Calculate area of parallelograms and trapezoids",
      "Perform reflections, translations, and rotations on a grid",
      "Compare credit and debit purchase implications",
    ],
  },
  "7": {
    strands: [
      "Number: operations with integers, operations with fractions, rate & proportion",
      "Algebra: solving linear equations, evaluating expressions",
      "Data: relative frequency, sampling",
      "Spatial: circumference and area of a circle, volume of prisms",
      "Financial literacy: taxes on purchases, simple interest",
    ],
    skills: [
      "Add, subtract, multiply, and divide integers",
      "Multiply and divide fractions",
      "Solve two-step linear equations",
      "Evaluate expressions with variables and integers",
      "Convert between fractions, decimals, and percents",
      "Solve rate and proportion word problems (unit rate, scale)",
      "Calculate circumference and area of a circle",
      "Calculate the volume of a rectangular prism",
      "Interpret relative-frequency tables",
      "Calculate GST/HST on a purchase in Canada",
      "Compute simple interest given P, r, and t",
    ],
  },
  "8": {
    strands: [
      "Number: rational numbers, square roots of perfect squares, exponents",
      "Algebra: multi-step linear equations, patterns using tables and graphs",
      "Data: scatter plots, measures of central tendency and variability",
      "Spatial: Pythagorean theorem, surface area and volume of cylinders",
      "Financial literacy: budgets, compound interest concept",
    ],
    skills: [
      "Order rational numbers on a number line (including negatives)",
      "Evaluate expressions with exponents and square roots of perfect squares",
      "Solve multi-step linear equations",
      "Graph a linear relation from a table of values",
      "Apply the Pythagorean theorem to find a missing side",
      "Calculate surface area and volume of a cylinder",
      "Interpret a scatter plot and describe correlation",
      "Compare simple and compound interest over multiple periods",
      "Build a monthly budget from income and expense categories",
      "Solve percent-change word problems",
    ],
  },
};

// Public API kept back-compat with the old `ontarioMathStrands[grade]` shape.
// New callers should use `ontarioMath.grade(g)` to also get the skill list.
export const ontarioMathStrands: Record<OntarioMathGrade, readonly string[]> =
  Object.fromEntries(
    (Object.keys(grades) as OntarioMathGrade[]).map((g) => [g, grades[g].strands])
  ) as Record<OntarioMathGrade, readonly string[]>;

export const ontarioMath = {
  grades: Object.keys(grades) as OntarioMathGrade[],
  grade(g: OntarioMathGrade | string): GradeEntry | null {
    return (grades as Record<string, GradeEntry>)[g] ?? null;
  },
} as const;
