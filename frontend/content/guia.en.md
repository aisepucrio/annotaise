# AnnotAISE User Guide

This guide is intended to help managers and researchers use AnnotAISE, a data annotation platform. It walks through the entire workflow, supporting the creation of validated datasets ready for analysis and for training artificial intelligence models.

## 1. Core concepts

- **Dataset:** The CSV file imported into an annotation task, containing the raw data to be annotated. Each row of the dataset becomes an independent data record within the platform.
- **Annotation task:** A specific annotation job, created by importing a dataset. It defines the form, the schedule, and the validation rules that annotators will follow.
- **Data record:** A row of the imported CSV dataset. Each data record requires annotation and is distributed to annotators according to the configured strategy.
- **Data field:** A dataset column bound to a data field in the form. It is the reference material displayed to the annotator (e.g., a code snippet, an image, a text passage).
- **Decision (agreement):** Some annotation tasks designate a multiple-choice question as the decisive question used to classify a data record. When automatic decision is enabled, the data record stays in circulation even after reaching the configured number of annotations per record, until one option achieves a strict majority among the responses.
- **LLM-assisted tiebreaker:** An optional mechanism triggered when a tie persists among human annotators on the decisive question. Multiple language models evaluate the data record, and the most-voted option among them is recorded as the final decision.
- **Group:** A set of users gathered under a single label. It simplifies assignment in larger teams, letting you grant access to an annotation task for every member of the group at once, without adding them individually.

## 2. How AnnotAISE works

This section gives a detailed overview of every tab in the platform's main navigation. The goal is to explain what each one does, guiding you through the system and its tools.

### 2.1 Users tab

This tab is available to administrators only and serves as the access control center of the platform. It supports full lifecycle management of the users in the system.

![Users tab, showing a card for each registered user](/docs/img/aba-usuarios-eng.png)

#### 2.1.1 Inviting new users

You can grow the team by sending invitations directly to the e-mail addresses of new collaborators. When sending the invitation, the administrator sets the privilege level of the account:

- **Administrator:** full access to system settings and to the management of other users (except other administrators).
- **Standard User:** access focused on carrying out annotation tasks and participating in specific projects.

> You can add multiple e-mail addresses at once, separating them with commas, line breaks, or whitespace, as long as they all receive the same account type and the invitation is sent in the same language. You can also automatically assign the user to a project and/or to an annotation task.

![New user invitation dialog](/docs/img/novo-usuario-eng.png)

#### 2.1.2 Account management

The tab offers an overview of every registered user, allowing essential information to be edited and kept up to date. The administrator can:

- Update basic details such as first name, last name, and e-mail.
- Change the account type, promoting a user to administrator or the other way around.
- Add the user to an existing group, or type a new name to create a new group.
- Remove the user from the platform.

![Edit user dialog](/docs/img/editar-usuario-eng.png)

### 2.2 Projects tab

This tab centralizes the view and control of every annotation task on the platform, supporting real-time monitoring of each annotation cycle. It is available to administrators only.

![Projects tab](/docs/img/aba-projetos-eng.png)

#### 2.2.1 Performance indicators

The interface displays metrics that matter for management, letting you immediately check the number of active users, the number of annotation tasks in progress, and the total of completed and validated annotation tasks.

#### 2.2.2 Creating new projects

The "New Project" button is the starting point of the entire workflow, where the initial guidelines for the process are defined.

#### 2.2.3 Management

From "Manage", you can adjust and update the project:

- Update core details such as name, description, and current project status.
- Fully manage the team attached to the project: view current members, add new collaborators, or revoke existing access.
- Set the authority level of each member individually, so that everyone holds the permissions appropriate to their responsibilities.

### 2.3 Manage annotation tasks tab

This tab is where the specific rules for response collection and dataset processing are defined. It is available to administrators only.

![Manage annotation tasks tab](/docs/img/gerenciar-rotulacoes-eng.png)

#### 2.3.1 Creation and import

The "New annotation task" button starts the process, allowing dataset import and the initial configuration of the analysis parameters.

> You can select the "Form only (no data records)" option if you want to create a supplementary form that does not require importing a dataset.

#### 2.3.2 Deadline monitoring and goal tracking

The system computes and displays the number of days elapsed based on the configured start and end dates. This gives you control over the schedule and over the team's working pace. You can also check the number of completed annotations against the total target. This indicator helps identify actual progress and how much remains before reaching the configured validation quorum.

#### 2.3.3 Managing the form lifecycle

Clicking "Manage" on a specific annotation task opens a full panel, organized into tabs: **Form**, where you define the structure of sections, data fields, and question fields; **Assign users** and **Assign groups**, which control who has access to the annotation task; **Annotations**, with the answers dashboard, agreement statistics, and export; **Annotation guidelines**, for authoring the instructions document; and **Decision**, where consensus parameters and tie resolution are configured.

Each of these steps is covered, with step-by-step instructions, in Section 3.

### 2.4 Annotate tab

This is the response tab, and the only one accessible to both Administrators and Standard Users. It is the direct working environment, where annotation tasks are actually carried out.

#### 2.4.1 Accessing assigned tasks

This page lists every annotation task the user is associated with. In other words, users see only the annotation tasks assigned to them by the owner.

#### 2.4.2 Submitting responses

After selecting an annotation task, the user is presented with the configured form and records their responses according to the established instructions.

![Annotation screen, with the form on the left and the annotation guideline on the right](/docs/img/aba-rotular-eng.png)

#### 2.4.3 Statistics

Beyond answering, users can track their own progress within each annotation task, seeing how many data records they have completed and how many remain before reaching the target for that task.

## 3. Using AnnotAISE

### 3.1 Setting up a data annotation job

#### 3.1.1 Step one

Start from the "Projects" tab, the control center of the platform. **Every annotation task must be attached to a project** to keep the data organized.

**Creation:** click "New Project" and define a name, a clear description, and the status (which can be updated as the research progresses).

![New project dialog](/docs/img/novo-projeto-eng.png)

**Team and permissions:** once created, click "Manage" to add members and set each one's access level:

- **Owner:** full control over settings, members, and deletion.
- **Collaborator:** can create annotation tasks and manage data.
- **Viewer:** can only follow progress, reports, and statistics.

![Project information and members screen](/docs/img/membros-projeto-eng.png)

#### 3.1.2 Step two

With the project created, go to the "Manage annotation tasks" tab to prepare the annotators' working environment.

**Data import:** after clicking "New annotation task", attach the dataset containing the data records to be evaluated.

![CSV import dialog](/docs/img/nova-rotulacao-upload-eng.png)

**Identification:** define a title and attach the annotation task to your project.

**Schedule:** set start and end dates for deadline control.

**Validation and consensus:**

- **Distribution strategy:** defines how data records are distributed among annotators (on-demand, pre-assigned, or anonymous mode).
- **Automatic decision:** enable it so that the system automatically resolves ties in the responses. You can choose whether that decision is made manually or by LLM.
- **Annotations per record:** defines how many people must annotate the same data record for it to be considered complete.
- **Assign groups:** lets you attach existing groups to the annotation task and set how many data records each user in each group should annotate.
- **Background questionnaire:** enable it to include a profile survey collecting information about the annotator, such as experience level, education, or familiarity with the topic.

![New annotation task dialog, showing the validation and consensus fields](/docs/img/nova-rotulacao-config1-eng.png)

![New annotation task dialog, showing the validation and consensus fields](/docs/img/nova-rotulacao-config2-eng.png)

#### 3.1.3 Step three

Once the annotation task is created, click "Manage" to configure the response interface. This step defines how the data is presented and collected.

##### Form

- **Organization into sections:** structure the annotation task into one or more sections, as needed. Treat each section as an independent block of analysis.
- **Data field configuration:** for each section, bind a dataset column that will serve as the reference material. The available data field types are text, image, number, category, date, code, audio, video, and PDF. Use this to display varied content at different stages of the form and to ensure each piece of information is rendered in the format appropriate to the original data.
- **Question fields:** write the questions for the annotation task and mark which ones are required, so that the resulting dataset is complete. Choose the most appropriate input type for each question (text, number, value range, multiple choice, or checkbox).

![Form editor, showing a section, a data field, and a question field](/docs/img/formulario1-eng.png)

![Form editor, showing a section, a data field, and a question field](/docs/img/formulario2-eng.png)

##### Assign users

Define which members have access to this annotation task. Annotators will be able to answer it, while Administrators will be able to open, edit, and manage it. Only the selected members will see this annotation task in the "Annotate" tab.

##### Assign groups

Grants access to the annotation task for an entire group of users at once, speeding up assignment in larger teams.

##### Annotations

This tab gathers the full history of responses collected in the annotation task, offering complementary ways of viewing them.

In the per-record view, you can inspect each data record individually, following the responses submitted by each annotator. Responses can be filtered by user, which is useful for reviewing the work of a specific annotator. Through the "Inspect" button, the administrator sees every response recorded for that data record side by side, making it possible to compare directly how different annotators evaluated the same piece of data.

![Per-record view, showing the data records and the Inspect button](/docs/img/respostas-eng.png)

The **answers dashboard** offers a consolidated view of the whole annotation task: for each question in the form, the system shows how the responses are distributed, along with averages and other general statistics that help identify patterns across the dataset. This view also reports the inter-annotator agreement indicator, showing the percentage of data records on which at least a minimum number of annotators converged on the same option.

![Answers dashboard, with response distribution and agreement](/docs/img/resumo-respostas-eng.png)

##### Annotation guidelines

The owner can author and publish a guideline document with clear instructions for the annotators. This document is essential for standardizing the analysis criteria and reducing subjectivity in the responses.

![Annotation guideline editor, with Markdown on the left and a live preview on the right](/docs/img/guia-rotulacao-eng.png)

##### Decision

If automatic decision is enabled, choose the multiple-choice question that will be used as the decisive question for automatically determining the final decision.

If a tie persists among human annotators even after the required number of annotations has been collected, and the automatic decision mode is configured as LLM (tiebreaker), the system queries multiple language models to evaluate the data record independently. Each model analyzes the data field content and the decisive question and selects one of the valid options. The most-voted option among the models is recorded as the final decision for that data record, and is identified in the dashboard as an LLM-generated decision.