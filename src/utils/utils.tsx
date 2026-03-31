import { ReactNode } from "react";
import DrugIcon from "../assets/icons/Drug.svg?react";
import GeneIcon from "../assets/icons/Gene.svg?react";
import ChemicalEntityIcon from "../assets/icons/Chemical.svg?react";
import AnatomicalEntityIcon from "../assets/icons/Anatomical Entity.svg?react";
import BiologicalEntityIcon from "../assets/icons/Biological Entity.svg?react";
import DiseaseIcon from "../assets/icons/Disease.svg?react";
import PhenotypicFeatureIcon from "../assets/icons/Phenotype.svg?react";
import PathologicalProcessIcon from "../assets/icons/Pathological Process.svg?react";
import SmallMoleculeIcon from "../assets/icons/Small Molecule.svg?react";
import PolypeptideIcon from "../assets/icons/Polypeptide.svg?react";
import PhysiologicalProcessIcon from "../assets/icons/Physiological Process.svg?react";

import DefaultIcon from "../assets/icons/Default.svg?react";

/**
 * Gets the icon for a node type.
 *
 * @param {string} type - The type of the node.
 * @returns {ReactNode} - The icon for the node type.
 */
export function getNodeTypeIcon(type: string): ReactNode {
  if (type.startsWith('biolink:')) {
    type = type.replace('biolink:', '');
  }
  switch (type) {
    case 'AnatomicalEntity':
      return <AnatomicalEntityIcon />;

    case 'BiologicalEntity':
      return <BiologicalEntityIcon />;

    case 'ChemicalEntity':
    case 'ChemicalMixture':
      return <ChemicalEntityIcon />;

    case 'DiseaseOrPhenotypicFeature':
    case 'Disease':
      return <DiseaseIcon />;

    case 'Drug':
      return <DrugIcon />;

    case 'Gene':
    case 'Protein':
      return <GeneIcon />;

    case 'PathologicalProcess':
      return <PathologicalProcessIcon />;

    case 'PhenotypicFeature':
      return <PhenotypicFeatureIcon />;

    case 'PhysiologicalProcess':
      return <PhysiologicalProcessIcon />;

    case 'Polypeptide':
      return <PolypeptideIcon />;

    case 'SmallMolecule':
      return <SmallMoleculeIcon />;

    default:   
      return <DefaultIcon />;
  }
}

/**
 * Capitalizes the first letter of a single word and lowercase the rest.
 *
 * @param {string} word - The word to capitalize.
 * @returns {string} - The capitalized word.
 */
export function capitalizeWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Checks if a word is a Roman numeral.
 *
 * @param {string} word - The word to check.
 * @returns {boolean} - True if the word is a Roman numeral, otherwise false.
 */
function isRomanNumeral(word: string): boolean {
  const romanNumeralPattern = /^(?=[MDCLXVI])M*(C[MD]|D?C{0,3})(X[CL]|L?X{0,3})(I[XV]|V?I{0,3})$/i;
  return romanNumeralPattern.test(word);
}

/**
 * Capitalize all words in a string
 * @param str - The string to capitalize
 * @param splitBy - The character to split the string by
 * @returns The capitalized string
 */
export function capitalizeAllWords(str: string, splitBy: string = ' '): string {
  return str.split(splitBy).map(word => {
    if (isRomanNumeral(word)) {
      return word.toUpperCase();
    } else {
      return capitalizeWord(word);
    }
  }).join(splitBy);
}