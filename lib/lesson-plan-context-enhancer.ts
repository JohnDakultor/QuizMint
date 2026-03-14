export function enhanceLessonPlanWithContext(lessonPlan: any, topic: string, subject: string, grade: string) {
  if (!lessonPlan.days || !Array.isArray(lessonPlan.days)) return lessonPlan;
  
  lessonPlan.days.forEach((day: any, index: number) => {
    const dayNumber = index + 1;
    
    // Enhance 4A's model with more context
    if (day["4asModel"] && Array.isArray(day["4asModel"])) {
      day["4asModel"] = day["4asModel"].map((phase: any, phaseIndex: number) => {
        // Add more detailed descriptions if they're too generic
        if (!phase.description || phase.description.length < 100) {
          switch (phase.phase) {
            case "ACTIVITY":
              phase.description = `Begin by engaging students with a thought-provoking question about ${topic}. Show real-world examples related to ${subject} at the ${grade} level. Have students share prior experiences with ${topic} through think-pair-share. The purpose is to build curiosity and connect to students' existing knowledge about ${topic.split(' ')[0]}.`;
              break;
            case "ANALYSIS":
              phase.description = `Guide students through analyzing key aspects of ${topic}. Present a mini-case study or data set related to ${subject}. Students work in small groups to identify patterns, ask questions, and formulate initial hypotheses. The teacher circulates to probe thinking with questions like "What evidence supports that?" and "How does this connect to what we learned previously?"`;
              break;
            case "ABSTRACTION":
              phase.description = `Direct instruction on core concepts of ${topic}. Use visual aids like diagrams or charts to explain relationships. Address common misconceptions students have about ${topic} in ${subject}. Provide mnemonic devices or strategies to help ${grade} students remember key information. Include worked examples showing step-by-step thinking.`;
              break;
            case "APPLICATION":
              phase.description = `Students apply their understanding of ${topic} to solve problems or complete tasks. Begin with guided practice where the teacher models thinking aloud. Then move to independent practice with scaffolded support. Use formative assessment strategies like exit tickets or quick checks to gauge understanding of ${topic} concepts.`;
              break;
          }
        }
        
        // Enhance teacher role
        if (!phase.teacherRole || phase.teacherRole.split(' ').length < 10) {
          phase.teacherRole = `Facilitate discussions about ${topic}, model thinking processes, provide clear examples from ${subject}, ask probing questions to deepen understanding, differentiate instruction for various learners, and provide immediate feedback on student work.`;
        }
        
        // Enhance student role
        if (!phase.studentRole || phase.studentRole.split(' ').length < 10) {
          phase.studentRole = `Actively participate in discussions, collaborate with peers to analyze ${topic}, take notes on key concepts, ask clarifying questions, apply learning to new situations, and self-assess understanding of ${subject} content.`;
        }
        
        // Enhance materials
        if (!phase.materials || phase.materials.length < 2) {
          phase.materials = [
            `Whiteboard or chart paper for ${topic} concepts`,
            `Printed resources about ${subject}`,
            `Student notebooks for ${grade} level work`,
            `Visual aids related to ${topic}`,
            `Technology for multimedia presentation (if available)`
          ];
        }
        
        return phase;
      });
    }
    
    // Enhance specific activities
    if (day.specificActivities) {
      // Reading Comprehension
      if (day.specificActivities.ACTIVITY) {
        if (!day.specificActivities.ACTIVITY.readingPassage || 
            day.specificActivities.ACTIVITY.readingPassage.length < 100) {
          day.specificActivities.ACTIVITY.readingPassage = `In the study of ${subject}, understanding ${topic} is crucial. For ${grade} students, this means examining how ${topic} functions in real-world contexts. Recent studies show that mastery of ${topic} concepts leads to better understanding of broader ${subject} principles. Students who engage deeply with ${topic} demonstrate improved critical thinking skills and application abilities.`;
        }
        
        // Enhance questions
        if (!day.specificActivities.ACTIVITY.questions || 
            day.specificActivities.ACTIVITY.questions.length < 3) {
          day.specificActivities.ACTIVITY.questions = [
            {
              question: `What is the main focus when studying ${topic} in ${subject}?`,
              answer: `The main focus is understanding how ${topic} functions within the broader context of ${subject}, including its key components, relationships, and practical applications for ${grade} level students.`
            },
            {
              question: `Why is understanding ${topic} important for students at the ${grade} level?`,
              answer: `Understanding ${topic} is important because it provides foundational knowledge for more advanced ${subject} concepts, helps develop critical thinking skills, and has practical applications in real-world situations relevant to ${grade} students.`
            },
            {
              question: `How might you apply your knowledge of ${topic} to a new situation in ${subject}?`,
              answer: `I could apply knowledge of ${topic} by identifying similar patterns in different contexts, using the principles learned to solve related problems, or explaining how ${topic} concepts connect to other areas of ${subject} study.`
            }
          ];
        }
      }
      
      // True/False + Checklist
      if (day.specificActivities.ANALYSIS) {
        if (!day.specificActivities.ANALYSIS.trueFalse || 
            day.specificActivities.ANALYSIS.trueFalse.length < 3) {
          day.specificActivities.ANALYSIS.trueFalse = [
            {
              statement: `${topic} is only relevant to advanced ${subject} studies and not important for ${grade} students.`,
              answer: "False",
              explanation: `${topic} provides foundational concepts essential for ${grade} students to understand broader ${subject} principles and real-world applications.`
            },
            {
              statement: `Understanding ${topic} requires memorizing complex formulas without understanding their meaning.`,
              answer: "False",
              explanation: `True understanding of ${topic} involves grasping underlying concepts and relationships, not just memorization. Application and analysis are key components.`
            },
            {
              statement: `${topic} concepts can be applied to solve real-world problems in ${subject}.`,
              answer: "True",
              explanation: `The principles of ${topic} have practical applications that help solve authentic problems, making the learning relevant and meaningful for ${grade} students.`
            }
          ];
        }
        
        if (!day.specificActivities.ANALYSIS.checklist || 
            day.specificActivities.ANALYSIS.checklist.length < 3) {
          day.specificActivities.ANALYSIS.checklist = [
            `I can explain the main concepts of ${topic} in my own words`,
            `I can identify examples of ${topic} principles in real-world ${subject} contexts`,
            `I can apply ${topic} knowledge to solve basic problems at the ${grade} level`
          ];
        }
      }
      
      // Matching Type
      if (day.specificActivities.ABSTRACTION) {
        if (!day.specificActivities.ABSTRACTION.pairs || 
            day.specificActivities.ABSTRACTION.pairs.length < 5) {
          day.specificActivities.ABSTRACTION.pairs = [
            { left: "Core Concept", right: `The fundamental idea that defines ${topic} in ${subject}` },
            { left: "Application", right: `How ${topic} principles are used in real ${subject} situations` },
            { left: "Analysis", right: `Breaking down ${topic} to understand its components and relationships` },
            { left: "Synthesis", right: `Combining ${topic} knowledge with other concepts to create new understanding` },
            { left: "Evaluation", right: `Assessing the effectiveness or validity of ${topic} applications` }
          ];
        }
        
        if (!day.specificActivities.ABSTRACTION.explanation || 
            day.specificActivities.ABSTRACTION.explanation.length < 100) {
          day.specificActivities.ABSTRACTION.explanation = `These matching pairs represent key aspects of understanding ${topic} in ${subject}. For ${grade} students, mastering these connections helps build a comprehensive framework for applying ${topic} knowledge. The relationships show how theoretical concepts translate to practical applications, which is essential for deep learning in ${subject}.`;
        }
      }
      
      // Multiple Choice + Identification
      if (day.specificActivities.APPLICATION) {
        if (!day.specificActivities.APPLICATION.multipleChoice || 
            day.specificActivities.APPLICATION.multipleChoice.length < 3) {
          day.specificActivities.APPLICATION.multipleChoice = [
            {
              question: `A ${grade} student is trying to apply ${topic} concepts to solve a ${subject} problem. Which approach demonstrates the best understanding?`,
              options: [
                "A. Memorizing the steps without understanding why they work",
                "B. Applying the concepts flexibly to the specific problem context",
                "C. Guessing based on similar-looking problems",
                "D. Asking for the answer without attempting to solve"
              ],
              answer: "B",
              explanation: `Option B demonstrates true understanding by applying ${topic} concepts flexibly to the specific context, showing comprehension rather than just memorization.`
            },
            {
              question: `When analyzing how ${topic} functions in different ${subject} scenarios, what is most important?`,
              options: [
                "A. Finding the fastest solution method",
                "B. Identifying patterns and relationships across contexts",
                "C. Memorizing all possible variations",
                "D. Avoiding any mistakes in calculation"
              ],
              answer: "B",
              explanation: `Identifying patterns and relationships (Option B) shows deeper understanding of ${topic} principles and their applications across different ${subject} contexts.`
            },
            {
              question: `How does understanding ${topic} help ${grade} students in other areas of ${subject}?`,
              options: [
                "A. It doesn't help with other areas",
                "B. It provides isolated knowledge for tests only",
                "C. It builds foundational thinking skills applicable to many topics",
                "D. It complicates other learning with unnecessary details"
              ],
              answer: "C",
              explanation: `Understanding ${topic} develops foundational thinking skills (Option C) that transfer to other areas of ${subject}, enhancing overall learning and problem-solving abilities.`
            }
          ];
        }
        
        if (!day.specificActivities.APPLICATION.identification || 
            !day.specificActivities.APPLICATION.identification.clues ||
            day.specificActivities.APPLICATION.identification.clues.length < 3) {
          day.specificActivities.APPLICATION.identification = {
            clues: [
              `The central idea that defines ${topic} in ${subject}`,
              `A practical use of ${topic} principles in real situations`,
              `The process of examining ${topic} components and their relationships`
            ],
            wordBank: ["Core Concept", "Application", "Analysis", "Synthesis", "Evaluation"],
            answers: ["Core Concept", "Application", "Analysis"]
          };
        }
      }
    }
    
    // Enhance assessment
    if (!day.assessment || day.assessment.length === 0) {
      day.assessment = [
        {
          criteria: `Understanding of ${topic} Concepts`,
          description: `Assesses student's ability to comprehend and apply key principles of ${topic} in ${subject} contexts appropriate for ${grade} level.`,
          rubricLevel: {
            excellent: `Student demonstrates comprehensive understanding by accurately explaining ${topic} concepts, providing multiple relevant examples from ${subject}, applying principles to novel situations, and making connections to broader ${subject} themes.`,
            satisfactory: `Student shows basic understanding by correctly defining ${topic} concepts, providing some relevant examples, applying principles with minor errors, and making limited connections to other ${subject} areas.`,
            needsImprovement: `Student struggles with fundamental ${topic} concepts, provides incorrect or irrelevant examples, makes significant errors in application, and shows difficulty connecting to other ${subject} learning.`
          }
        }
      ];
    }
    
    // Enhance differentiation
    if (!day.differentiation || day.differentiation.length < 50) {
      day.differentiation = `Differentiation strategies for ${topic}:\n- For struggling students: Provide graphic organizers for ${topic} concepts, use sentence starters for responses, offer additional worked examples from ${subject}, and allow partner work.\n- For advanced students: Offer extension problems applying ${topic} to complex ${subject} scenarios, encourage independent research on related topics, and provide opportunities to teach concepts to peers.\n- For ELL students: Use visual aids for ${topic} vocabulary, provide bilingual word banks, allow use of translation tools, and offer additional processing time.\n- For students with special needs: Break ${topic} tasks into smaller steps, provide checklist for task completion, allow alternative response methods, and offer frequent feedback.`;
    }
    
    // Enhance closure
    if (!day.closure || day.closure.length < 50) {
      day.closure = `Lesson closure for Day ${dayNumber}:\n1. Quick review: "Today we explored ${topic} concepts including..."\n2. Connection: "Tomorrow we'll build on this by examining how ${topic} relates to..."\n3. Exit ticket: "On a sticky note, write one thing you learned about ${topic} and one question you still have."\n4. Preview: "For homework, look for examples of ${topic} principles in your daily life or media."`;
    }
  });
  
  return lessonPlan;
}

