/* eslint-disable @typescript-eslint/no-use-before-define */
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { Asciidoctor } from 'asciidoctor/types';
import {AllHtmlEntities} from 'html-entities';

import { Alert, List, ListItem, Title } from '@patternfly/react-core';
import LightbulbIcon from '@patternfly/react-icons/dist/js/icons/lightbulb-icon';
import FireIcon from '@patternfly/react-icons/dist/js/icons/fire-icon';
import { css } from '@patternfly/react-styles';
import './util.scss';

// private CONST = 'string' + maps
const MODULE_TYPE_ATTRIBUTE = 'module-type';
const PREREQUISITES = 'Prerequisites';
const PROCEDURE = 'Procedure';

enum AdmonitionType {
  TIP = 'TIP',
  NOTE = 'NOTE',
  IMPORTANT = 'IMPORTANT',
  WARNING = 'WARNING',
  CAUTION = 'CAUTION',
}

const admonitionToAlertVariantMap = {
  [AdmonitionType.NOTE]: { variant: 'info' },
  [AdmonitionType.TIP]: { variant: 'default', customIcon: <LightbulbIcon /> },
  [AdmonitionType.IMPORTANT]: { variant: 'danger' },
  [AdmonitionType.CAUTION]: { variant: 'warning', customIcon: <FireIcon /> },
  [AdmonitionType.WARNING]: { variant: 'warning' },
};
// end private CONST = 'string' + maps

// private utils
const getListTexts = (list: Asciidoctor.List) => {
  let admonitionBlock: Asciidoctor.AbstractBlock;
  return list.getItems().map((listItem: Asciidoctor.ListItem) => {
    admonitionBlock = listItem.getBlocks().find((block) => {
      return isAdmonitionBlock(block);
    });
    if (admonitionBlock) {
      const admonitionRendered = renderAdmonitionBlock(admonitionBlock, true);
      return listItem.setText(listItem.getText() + admonitionRendered);
    }
    return listItem.getText();
  });
};

const withAdocWrapper = (Component: React.ReactNode, nodeName: string, title: string) => {
  return (
    <div className={nodeName}>
      <div className="title">{title}</div>
      {Component}
    </div>
  );
};

const renderMarkup = (component: React.ReactElement) => {
  return ReactDOMServer.renderToStaticMarkup(component);
};
// end private utils

// private block identifying helpers
const getModuleType = (node: Asciidoctor.AbstractNode) => {
  if (node.getAttributes()[MODULE_TYPE_ATTRIBUTE]) {
    return node.getAttributes()[MODULE_TYPE_ATTRIBUTE];
  }

  const id = node.getId();

  if (id && id.startsWith('con-')) {
    return 'con';
  }

  if (id && id.startsWith('proc-')) {
    return 'proc';
  }

  if (id && id.startsWith('ref-')) {
    return 'ref';
  }
  return 'unknown'; // punt, we don't know
};

const isProcedure = (node: Asciidoctor.AbstractNode) => {
  return getModuleType(node) === 'proc';
};

const isPrerequisites = (node: Asciidoctor.AbstractBlock) => {
  return node.getTitle && node.getTitle() === PREREQUISITES;
};

const isListBlock = (node: Asciidoctor.AbstractBlock) => {
  return node.getNodeName() === 'olist' || node.getNodeName() === 'ulist';
};

const isProcedureListBlock = (node: Asciidoctor.AbstractBlock) => {
  return node.getTitle && node.getTitle() === PROCEDURE && isListBlock(node);
};
// end private block identifying helpers

// public block identifying helpers
export const isAdmonitionBlock = (node: Asciidoctor.AbstractBlock) => {
  return node.getNodeName() === 'admonition';
};

export const isTaskLevelPrereqs = (node: Asciidoctor.AbstractBlock) => {
  return isPrerequisites(node) && isListBlock(node) && isProcedure(node.getParent());
};

export const isTaskLevelProcedure = (node: Asciidoctor.AbstractBlock) => {
  return isProcedureListBlock(node) && isProcedure(node.getParent());
};
// end public block identifying helpers
// leaving here for now if design wants to revert to using card
// const renderPFNote = (node: Asciidoctor.AbstractBlock, inList: boolean = false) => {
//   const noteTitle = (node.getAttribute && node.getAttribute('textlabel')) || 'Note';
//   const classNames = {
//     inList: {
//       card: 'task-pflist-list__item__content__note',
//       cardBody: 'task-pflist-list__item__content__note__body',
//     },
//     inDescription: {
//       card: 'description-note',
//       cardBody: 'description-note__body',
//     },
//   };
//   const note = (
//     <Card
//       isPlain
//       isFlat
//       isCompact
//       className={css(inList && classNames.inList.card, !inList && classNames.inDescription.card)}
//     >
//       <CardBody
//         className={css(
//           inList && classNames.inList.cardBody,
//           !inList && classNames.inDescription.cardBody,
//         )}
//       >
//         <strong>{noteTitle}:</strong> {node.getContent()}
//       </CardBody>
//     </Card>
//   );
//   // Don't render to markup yet, will be passed through by parent
//   return ReactDOMServer.renderToString(note);
// };

// public renderers
export const renderAdmonitionBlock = (node: Asciidoctor.AbstractBlock, inList: boolean) => {
  const admonitionType = node.getAttribute('style');
  const { variant, customIcon } = admonitionToAlertVariantMap[admonitionType];
  const style = admonitionType === AdmonitionType.CAUTION ? { backgroundColor: '#ec7a0915' } : {};

  const pfAlert = (
    <Alert
      variant={variant}
      customIcon={customIcon && customIcon}
      isInline
      title={admonitionType}
      className={css(!inList && 'description-important')}
      style={style}
    >
      {AllHtmlEntities.decode(node.getContent())}
    </Alert>
  );
  return ReactDOMServer.renderToString(pfAlert);
};

export const renderPFList = (list: Asciidoctor.List) => {
  const listTitle = list.getTitle();
  const listType = list.getNodeName();
  const isPrereqList = listTitle === PREREQUISITES;
  const isProcList = listTitle === PROCEDURE;
  const listComponentType = listType === 'olist' ? 'ol' : 'ul';
  const prereqTexts: string[] = getListTexts(list);
  const PFList = (
    <div className="task-pflist">
      <Title headingLevel="h6" className="task-pflist-title">
        {listTitle}
      </Title>
      {isPrereqList && (
        <p className="task-pflist-subtitle">
          In addtion to the prerequisites for this Quick Start, this step requires:
        </p>
      )}
      <List
        component={listComponentType}
        className={css(
          'task-pflist-list',
          isPrereqList && 'task-pflist-list--prereq',
          isProcList && 'task-pflist-list--proc',
        )}
      >
        {prereqTexts.map((text) => (
          <ListItem
            className={css(
              isPrereqList && 'task-pflist-list__item--prereq',
              isProcList && 'task-pflist-list__item--proc',
              'task-pflist-list__item',
            )}
            key={text}
          >
            <span
              className="task-pflist-list__item__content"
              dangerouslySetInnerHTML={{ __html: text }}
            />
          </ListItem>
        ))}
      </List>
    </div>
  );
  const preReqReact = withAdocWrapper(PFList, listType, listTitle);
  return renderMarkup(preReqReact);
};
// end public renderers
