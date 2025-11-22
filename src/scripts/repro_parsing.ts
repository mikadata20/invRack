
const PART_NO_CLEAN_REGEX = /[^A-Z0-9]/g;
const PART_NO_VALID_FORMAT_REGEX = /^[A-Z0-9]{10}$/;

const input1 = "IKKYB1GNP418101    25-PRCB-60585  0000982680SY235               00020B6415-69372         BUCKET              9632107140    KI BALL,STEEL               0002000320250903";
const input2 = "IKKYB1GNP418101    25-PRCB-60542  0000972255SY235               00020B6415-69372         BUCKET              3042180027    KI BUSHING,PIN              0000500220250711";

function test(input: string) {
    console.log("Testing input:", input);
    const tokens = input.split(" ").filter(Boolean);
    console.log("Tokens:", tokens);

    for (const token of tokens) {
        const cleanedToken = token.replace(PART_NO_CLEAN_REGEX, '');
        const isMatch = PART_NO_VALID_FORMAT_REGEX.test(cleanedToken);
        console.log(`Token: "${token}" -> Cleaned: "${cleanedToken}" -> Match: ${isMatch}`);
        if (isMatch) {
            console.log("FOUND MATCH:", cleanedToken);
            return;
        }
    }
    console.log("NO MATCH FOUND");
}

console.log("--- INPUT 1 (User says works) ---");
test(input1);
console.log("\n--- INPUT 2 (User says fails) ---");
test(input2);
