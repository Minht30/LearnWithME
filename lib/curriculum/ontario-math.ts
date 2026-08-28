/**
 * Ontario Mathematics curriculum · Grades 1–8, five strands.
 * Source: https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics
 * Kept intentionally short — the model uses these as anchor phrases, not as full outcomes.
 */

export const ontarioMathStrands = {
  "1": [
    "Number: counting to 50, place value to tens, addition & subtraction to 20",
    "Algebra: repeating patterns, equality with =",
    "Data: simple concrete graphs, sorting",
    "Spatial: comparing lengths, 2D shapes, simple 3D solids",
    "Financial literacy: recognizing Canadian coins",
  ],
  "2": [
    "Number: counting to 200, place value to hundreds, addition & subtraction to 100, halves & fourths",
    "Algebra: growing patterns, unknown in an equation",
    "Data: bar graphs, mode",
    "Spatial: measuring with cm, geometric attributes of 2D shapes",
    "Financial literacy: coin combinations to $2",
  ],
  "3": [
    "Number: whole numbers to 1000, multiplication & division facts to 5×5, fractions of a whole",
    "Algebra: patterns in tables, order of operations with + and −",
    "Data: pictographs with many-to-one, mean of small sets",
    "Spatial: perimeter, area with grid units, angles as turns",
    "Financial literacy: making change from $10",
  ],
  "4": [
    "Number: whole numbers to 10 000, multiplication facts to 10×10, division with remainders, decimal tenths, equivalent fractions",
    "Algebra: patterns using variables, one-step equations",
    "Data: line graphs, range and median",
    "Spatial: area of rectangles, angle measurement in degrees",
    "Financial literacy: value of money and simple purchases",
  ],
  "5": [
    "Number: whole numbers to 100 000, multi-digit multiplication and division, decimal hundredths, mixed numbers, percents as parts of 100",
    "Algebra: two-step equations, growing & shrinking patterns",
    "Data: double bar graphs, mean/median/mode",
    "Spatial: area of triangles, volume with cubes, coordinate grid quadrant 1",
    "Financial literacy: budgeting simple items, unit price",
  ],
  "6": [
    "Number: integers, decimals to thousandths, ratios and rates, percent of a whole number",
    "Algebra: expressions and equations with one variable, order of operations with brackets",
    "Data: circle graphs, misleading graphs",
    "Spatial: transformations, area of parallelograms and trapezoids, nets of 3D solids",
    "Financial literacy: interest, credit vs debit basics",
  ],
  "7": [
    "Number: operations with integers, operations with fractions, rate & proportion",
    "Algebra: solving linear equations, evaluating expressions",
    "Data: relative frequency, sampling",
    "Spatial: circumference and area of a circle, volume of prisms",
    "Financial literacy: taxes on purchases, simple interest",
  ],
  "8": [
    "Number: rational numbers, square roots of perfect squares, exponents",
    "Algebra: multi-step linear equations, patterns using tables and graphs",
    "Data: scatter plots, measures of central tendency and variability",
    "Spatial: Pythagorean theorem, surface area and volume of cylinders",
    "Financial literacy: budgets, compound interest concept",
  ],
} as const;

export type OntarioMathGrade = keyof typeof ontarioMathStrands;
